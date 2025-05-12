// my-app/app/page.tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/game');
  // return null; // Or some minimal loading indicator, though redirect is usually fast
}