"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CircleIcon,
  Settings,
  BookCheck,
  LogOut,
  LayoutDashboard,
  BadgeCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/lib/auth";
import { signOut } from "@/app/(login)/actions";
import { useRouter } from "next/navigation";

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, setUser } = useUser();
  const router = useRouter();

  async function handleSignOut() {
    setUser(null);
    await signOut();
    router.push("/");
  }

  return (
    <header className="border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <CircleIcon className="h-6 w-6 text-orange-500" />
          <span className="ml-1 text-lg lg:text-xl font-semibold text-gray-900">
            BarQuest
          </span>
        </Link>
        <div className="flex items-center lg:hidden">
          <Link href="/dashboard/" passHref>
            <Button variant="ghost" className="my-1">
              <LayoutDashboard className="mr-1 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/dashboard/newtest/" passHref>
            <Button variant="ghost" className="my-1">
              <BadgeCheck className="mr-1 h-4 w-4" />
              New Test
            </Button>
          </Link>
        </div>
        <div className="flex items-center space-x-2">
          {user ? (
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer size-8">
                  <AvatarImage alt={user.name || ""} />
                  <AvatarFallback>
                    {user.email
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="p-0">
                <DropdownMenuItem className="w-full cursor-pointer m-1">
                  <Link
                    href="/dashboard/settings"
                    className="flex w-full items-center"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="w-full cursor-pointer m-1">
                  <Link
                    href="/dashboard/subscription"
                    className="flex w-full items-center"
                  >
                    <BookCheck className="mr-2 h-4 w-4" />
                    <span>My Subscription</span>
                  </Link>
                </DropdownMenuItem>
                <form action={handleSignOut} className="p-1">
                  <button type="submit" className="flex w-full">
                    <DropdownMenuItem className="w-full cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              asChild
              className="bg-black hover:bg-gray-800 text-white text-sm px-4 py-2 rounded-full"
            >
              <Link href="/sign-up">Sign Up</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col min-h-screen">
      <Header />
      {children}
    </section>
  );
}
