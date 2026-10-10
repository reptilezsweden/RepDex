-- Make a user an admin. Run in the Supabase SQL editor after that user has signed up.
-- Replace the email address with your own.
update public.profiles set role = 'admin' where email = 'you@example.com';
