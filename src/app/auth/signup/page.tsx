import { Metadata } from 'next'
import SignupForm from '@/components/auth/SignupForm'

export const metadata: Metadata = {
  title: 'Sign Up - OrbitABM',
  description: 'Create your OrbitABM account',
}

export default function SignupPage() {
  return <SignupForm />
}