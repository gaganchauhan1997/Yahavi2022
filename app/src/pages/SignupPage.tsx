
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

const SignupPage = () => {
  return (
    <div className='flex items-center justify-center min-h-screen bg-background p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>Join HackKnow to access premium resources.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <label>Full Name</label>
            <Input placeholder='John Doe' />
          </div>
          <div className='space-y-2'>
            <label>Email</label>
            <Input type='email' placeholder='m@example.com' />
          </div>
          <div className='space-y-2'>
            <label>Password</label>
            <Input type='password' />
          </div>
        </CardContent>
        <CardFooter className='flex flex-col gap-4'>
          <Button className='w-full'>Sign Up</Button>
          <p className='text-sm text-center'>
            Already have an account? <a href='/login' className='text-primary hover:underline'>Login via Shop</a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignupPage;
