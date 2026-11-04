import { Inter } from 'next/font/google';
import { Provider } from '@/components/provider';
import '../global.css';
import type { Metadata } from 'next';
import { appName, basePath } from '@/lib/shared';

const inter = Inter({
  subsets: ['latin'],
});

export async function generateMetadata({params}: {params:Promise<{lang:string}>}):Promise<Metadata> {
  const {lang}=await params;
  const name=lang==='de'?'ORISO Dokumentation':appName;
  return {metadataBase:new URL('https://docs.oriso.org'),title:{default:name,template:`%s · ${name}`},icons:{icon:`${basePath}/favicon.svg`},robots:{index:false,follow:false}};
}

export default async function Layout({ children, params }: {children: React.ReactNode; params: Promise<{lang: string}>}) {
  const {lang} = await params;
  return (
    <html lang={lang} className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider lang={lang}>{children}</Provider>
      </body>
    </html>
  );
}
