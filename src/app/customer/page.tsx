import { redirect } from 'next/navigation';

export default function CustomerRootPage() {
  redirect('/customer/login');
}
