"use client";

/** Muestra el icono de un producto: imagen (data URL), emoji o marcador. */
export function ProductIcon({
  icon,
  size = 28,
}: {
  icon?: string;
  size?: number;
}) {
  const px = `${size}px`;
  if (icon && icon.startsWith("data:")) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={icon}
        alt=""
        className="shrink-0 rounded object-cover"
        style={{ width: px, height: px }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded bg-neutral-200 text-neutral-500"
      style={{ width: px, height: px, fontSize: size * 0.6 }}
    >
      {icon || "📦"}
    </span>
  );
}
