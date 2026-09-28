import { AuthSync } from "@/components/auth/AuthSync";

export default function CollectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthSync />
      {children}
    </>
  );
}