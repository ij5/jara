import { useEffect, useRef, useState } from "react";
import "./App.css";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [image, setImage] = useState("");
  const [ltrb, setLtrb] = useState<[number, number, number, number]>([
    10, 10, 10, 10,
  ]);
  const ltrbRef = useRef<[number, number, number, number]>([
    10, 10, 10, 10,
  ]);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    ltrbRef.current = ltrb;
  }, [ltrb]);

  const bboxesListener = async (event: any) => {
    const bboxes = event.payload as any[];
    for (const bbox of bboxes) {
      const nose = bbox.data[0];
      if (nose.mask < 0.7) {
        continue;
      }
      const width = imgRef.current?.naturalWidth ?? 320;
      const height = imgRef.current?.naturalHeight ?? 320;
      const x = nose.x / width * 320;
      const y = nose.y / height * 320;
      if (
        x < ltrbRef.current[0] ||
        x > 320 - ltrbRef.current[2] ||
        y < ltrbRef.current[1] ||
        y > 320 - ltrbRef.current[3]
      ) {
        invoke("overflow");
      } else {
        invoke("close_alert");
      }
    }
  };
  const imageListener = async (event: any) => {
    const data = event.payload as Uint8Array;
    const image = btoa(String.fromCharCode(...data));
    setImage("data:image/jpeg;base64," + image);
  };

  useEffect(() => {
    let unlistenImage: (() => void) | null = null;
    let unlistenBboxes: (() => void) | null = null;
    listen("image", imageListener).then((unlisten) => {
      unlistenImage = unlisten;
    });
    listen("bboxes", bboxesListener).then((unlisten) => {
      unlistenBboxes = unlisten;
    });
    return () => {
      if (unlistenImage) unlistenImage();
      if (unlistenBboxes) unlistenBboxes();
    };
  }, []);

  return (
    <main className="container w-full h-full flex flex-col items-center justify-center select-none">
      <div className="text-2xl font-bold p-4">바른 자세 알림</div>
      <div className="text-sm text-gray-500">
        가장자리 영역을 드래그하여 조절해보세요.
      </div>
      <div className="relative w-[320px] h-[320px]">
        <img src={image} ref={imgRef} className="absolute w-full h-full object-cover" />
        <div
          className="absolute h-full left-0 top-0 bg-red-500 opacity-30"
          style={{
            width: `${ltrb[0]}px`,
          }}
        >
          <div
            className="absolute h-full w-[10px] right-0 top-0 cursor-col-resize"
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startLeft = ltrb[0];
              const handleMouseMove = (e: MouseEvent) => {
                const deltaX = e.clientX - startX;
                let newLeft = startLeft + deltaX;
                if (newLeft < 10) newLeft = 10;
                else if (newLeft > 310) newLeft = 310;
                setLtrb((prev) => [newLeft, prev[1], prev[2], prev[3]]);
              };
              const handleMouseUp = () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
              };
              document.addEventListener("mousemove", handleMouseMove);
              document.addEventListener("mouseup", handleMouseUp);
            }}
          ></div>
        </div>
        <div
          className="absolute w-full left-0 top-0 bg-red-500 opacity-30"
          style={{
            height: `${ltrb[1]}px`,
          }}
        >
          <div
            className="absolute w-full h-[10px] bottom-0 left-0 cursor-row-resize"
            onMouseDown={(e) => {
              const startY = e.clientY;
              const startTop = ltrb[1];
              const handleMouseMove = (e: MouseEvent) => {
                const deltaY = e.clientY - startY;
                let newTop = startTop + deltaY;
                if (newTop < 10) newTop = 10;
                else if (newTop > 310) newTop = 310;
                setLtrb((prev) => [prev[0], newTop, prev[2], prev[3]]);
              };
              const handleMouseUp = () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
              };
              document.addEventListener("mousemove", handleMouseMove);
              document.addEventListener("mouseup", handleMouseUp);
            }}
          ></div>
        </div>
        <div
          className="absolute h-full right-0 top-0 bg-red-500 opacity-30"
          style={{
            width: `${ltrb[2]}px`,
          }}
        >
          <div
            className="absolute h-full w-[10px] left-0 top-0 cursor-col-resize"
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startRight = ltrb[2];
              const handleMouseMove = (e: MouseEvent) => {
                const deltaX = startX - e.clientX;
                let newRight = startRight + deltaX;
                if (newRight < 10) newRight = 10;
                else if (newRight > 310) newRight = 310;
                setLtrb((prev) => [prev[0], prev[1], newRight, prev[3]]);
              };
              const handleMouseUp = () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
              };
              document.addEventListener("mousemove", handleMouseMove);
              document.addEventListener("mouseup", handleMouseUp);
            }}
          ></div>
        </div>
        <div
          className="absolute w-full right-0 bottom-0 bg-red-500 opacity-30"
          style={{
            height: `${ltrb[3]}px`,
          }}
        >
          <div
            className="absolute w-full h-[10px] top-0 left-0 cursor-row-resize"
            onMouseDown={(e) => {
              const startY = e.clientY;
              const startBottom = ltrb[3];
              const handleMouseMove = (e: MouseEvent) => {
                const deltaY = startY - e.clientY;
                let newBottom = startBottom + deltaY;
                if (newBottom < 10) newBottom = 10;
                else if (newBottom > 310) newBottom = 310;
                setLtrb((prev) => [prev[0], prev[1], prev[2], newBottom]);
              };
              const handleMouseUp = () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
              };
              document.addEventListener("mousemove", handleMouseMove);
              document.addEventListener("mouseup", handleMouseUp);
            }}
          ></div>
        </div>
      </div>
      <button className="mt-20" onClick={() => setLtrb([10, 10, 10, 10])}>
        초기화
      </button>
    </main>
  );
}

export default App;
