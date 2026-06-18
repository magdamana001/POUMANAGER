"use client";

/** Avatar del empleado: foto (data URL), emoji o inicial sobre su color. */
export function EmployeeAvatar({
  name,
  color,
  avatar,
  size = 36,
}: {
  name: string;
  color?: string;
  avatar?: string;
  size?: number;
}) {
  if (avatar && avatar.startsWith("data:")) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img src={avatar} alt={name} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
    );
  }
  if (avatar) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{ width: size, height: size, fontSize: size * 0.55, backgroundColor: `${color ?? "#999"}22` }}
      >
        {avatar}
      </span>
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: color ?? "#999" }}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}
