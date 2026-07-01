'use client';

interface StickerBoxProps {
  hn: string;
}

export default function StickerBox({ hn }: StickerBoxProps) {
  return (
    <div className="sticker-box">
      <strong>ติดสติ๊กเกอร์ผู้ป่วย</strong>
      <br />
      <small>(Patient Sticker)</small>
      {hn && <span className="sticker-hn">HN: {hn}</span>}
    </div>
  );
}