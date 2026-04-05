export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      {/* 顶部标题 */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">🏫 虚拟校园</h1>
        <p className="mt-1 text-sm text-muted-foreground">先规划，再行动</p>
      </div>

      {/* 主内容区域 */}
      <div className="w-full max-w-[400px]">{children}</div>

      {/* 底部说明 */}
      <p className="mt-8 text-xs text-muted-foreground">
        完全免费 · 面向学生
      </p>
    </div>
  );
}
