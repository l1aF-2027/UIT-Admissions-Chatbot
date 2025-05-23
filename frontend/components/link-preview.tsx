import React from "react";

type LinkPreviewProps = {
  href: string;
};

export function LinkPreview({ href }: LinkPreviewProps) {
  // Nếu là ảnh thì render thẻ img
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        <img src={href} alt={href} className="max-w-xs max-h-48 rounded my-2" />
      </a>
    );
  }
  // Nếu là link HTML thì chỉ render link, có thể mở rộng để fetch Open Graph
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline break-all flex items-center gap-1 my-2"
    >
      <span>🔗</span>
      {href}
    </a>
  );
}