/**
 * Root Layout
 */
// export const runtime = 'edge';
import './styles/globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Social Media Ads Platform',
  description: 'Unified platform for managing ads across multiple social media platforms',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
