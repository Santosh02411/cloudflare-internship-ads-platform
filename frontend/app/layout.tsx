export const dynamicParams = true;

export function generateStaticParams() {
  return []; // This allows the build to finish without knowing IDs upfront
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}