"use client";

import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { auth } from "@/firebase/client";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { signIn, signUp } from "@/lib/actions/auth.action";

const authFormSchema = (type: FormType) => {
  return z.object({
    name: type === "sign-up" ? z.string().min(3) : z.string().optional(),
    email: z.string().email(),
    password: z.string().min(3),
  });
};

const AuthForm = ({ type }: { type: FormType }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const formSchema = authFormSchema(type);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      if (type === "sign-up") {
        const { name, email, password } = data;

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        const result = await signUp({
          uid: userCredential.user.uid,
          name: name!,
          email,
          password,
        });

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success("Account created successfully. Please sign in.");
        router.push("/sign-in");
      } else {
        const { email, password } = data;

        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        const idToken = await userCredential.user.getIdToken();
        if (!idToken) {
          toast.error("Sign in Failed. Please try again.");
          return;
        }

        await signIn({
          email,
          idToken,
        });

        toast.success("Signed in successfully.");
        router.push("/");
      }
    } catch (error) {
      console.log(error);
      toast.error(`There was an error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isSignIn = type === "sign-in";

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center">
              <span className="text-black font-bold text-lg">P</span>
            </div>
            <h1 className="text-white text-2xl font-light tracking-wide">
              PrepWise
            </h1>
          </div>
          <p className="text-gray-400 text-sm">
            Practice job interviews with AI
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {!isSignIn && (
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Name
              </label>
              <input
                {...register("name")}
                type="text"
                placeholder="Your Name"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-colors"
              />
              {errors.name && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              placeholder="Your email address"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-colors"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Password
            </label>
            <input
              {...register("password")}
              type="password"
              placeholder="Enter your password"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-colors"
            />
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading}
            className="w-full py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Loading..." : isSignIn ? "Sign In" : "Create Account"}
          </button>
        </div>

        {/* Footer Link */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            {isSignIn ? "No account yet?" : "Have an account already?"}
            <Link
              href={!isSignIn ? "/sign-in" : "/sign-up"}
              className="text-white font-medium ml-2 hover:underline transition-colors"
            >
              {!isSignIn ? "Sign In" : "Sign Up"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
