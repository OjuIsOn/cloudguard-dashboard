import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { connectDB } from "@/lib/db"
import { User } from "../../../../models/user"
import { loginSchema } from "@/lib/validation"

export async function POST(req: Request) {
  try {
    await connectDB()

    const body = await req.json()


    const { email, password } = body

    
    console.log(body);
    const user = await User.findOne({ email })
    console.log(user);
    
    if (!user) {

      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    const res = NextResponse.json({ message: "Login successful" })
   
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    return res
  } catch (error: any) {
    console.error("Login error:", error.message, error.stack)
    return NextResponse.json(
      { error: "An unexpected error occurred", details: error.message },
      { status: 500 }
    )
  }
}