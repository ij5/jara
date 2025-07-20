
#[cfg(feature = "mkl")]
extern crate intel_mkl_src;

#[cfg(feature = "accelerate")]
extern crate accelerate_src;


use std::io::Cursor;

use nokhwa::{
    pixel_format::RgbFormat,
    utils::{CameraIndex, RequestedFormat, RequestedFormatType},
    Camera,
};
use serde_json::json;
use tauri::{Emitter, Manager};
mod vision;

fn init_camera() -> Camera {
    let index = CameraIndex::Index(0);
    let requested =
        RequestedFormat::new::<RgbFormat>(RequestedFormatType::AbsoluteHighestFrameRate);
    let camera = Camera::new(index, requested).unwrap();
    camera
}

#[tauri::command]
async fn overflow(app: tauri::AppHandle) {
    println!("Showing window...");
    let _new_window = tauri::WebviewWindowBuilder::new(
        &app,
        "alert",
        tauri::WebviewUrl::App("alert.html".into()),
    )
    .title("경고")
    .inner_size(640., 640.)
    .center()
    .decorations(false)
    .always_on_top(true)
    .build()
    .unwrap();
}

#[tauri::command]
fn close_alert(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("alert") {
        window.close().map_err(|e| e.to_string()).unwrap();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let camera = init_camera();
            let rx = vision::track::setup(camera);
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                while let Ok((img, bboxes)) = rx.recv() {
                    let rgb = img.to_rgb8();
                    let mut data = Cursor::new(Vec::new());
                    rgb.write_to(&mut data, image::ImageFormat::Jpeg).unwrap();
                    app_handle.emit("image", data.into_inner()).unwrap();
                    let bboxes = bboxes
                        .iter()
                        .map(|b| {
                            json!({
                                "xmin": b.xmin,
                                "ymin": b.ymin,
                                "xmax": b.xmax,
                                "ymax": b.ymax,
                                "confidence": b.confidence,
                                "data": b.data.iter().map(|kp| json!({
                                    "x": kp.x,
                                    "y": kp.y,
                                    "mask": kp.mask,
                                })).collect::<Vec<_>>(),
                            })
                        })
                        .collect::<Vec<_>>();
                    app_handle.emit("bboxes", bboxes).unwrap();
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![overflow, close_alert])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
