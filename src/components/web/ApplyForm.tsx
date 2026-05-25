"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, User, MessageSquare, GraduationCap } from "lucide-react";
interface Course {
  id: number;
  title: string;
}

const applySchema = z.object({
  name: z.string().min(2, "姓名至少2个字符"),
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
  courseId: z.string().optional(),
  message: z.string().optional(),
});

type ApplyFormData = z.infer<typeof applySchema>;

interface ApplyFormProps {
  courses: Course[];
  selectedCourseId?: number;
}

export function ApplyForm({ courses, selectedCourseId }: ApplyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ApplyFormData>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      courseId: selectedCourseId ? String(selectedCourseId) : "",
    },
  });

  const onSubmit = async (data: ApplyFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          courseId: data.courseId ? parseInt(data.courseId) : null,
          message: data.message,
        }),
      });

      if (!response.ok) {
        throw new Error("提交失败");
      }

      setIsSuccess(true);
      reset();
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err) {
      console.error("Submit error:", err);
      alert("报名提交失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {isSuccess && (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg">
          报名信息提交成功！我们将尽快与您联系。
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          姓名 *
        </Label>
        <Input
          id="name"
          placeholder="请输入您的姓名"
          {...register("name")}
          className={errors.name ? "border-red-500" : ""}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone" className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          联系电话 *
        </Label>
        <Input
          id="phone"
          placeholder="请输入您的手机号"
          {...register("phone")}
          className={errors.phone ? "border-red-500" : ""}
        />
        {errors.phone && (
          <p className="text-sm text-red-500">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="courseId" className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          意向专业
        </Label>
        <select
          id="courseId"
          {...register("courseId")}
          className="w-full h-10 px-3 rounded-md border border-input bg-background"
        >
          <option value="">请选择意向专业</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          留言
        </Label>
        <Textarea
          id="message"
          placeholder="请输入您想咨询的问题（选填）"
          rows={4}
          {...register("message")}
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-red-600 hover:bg-red-700"
        disabled={isSubmitting}
      >
        {isSubmitting ? "提交中..." : "立即报名"}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        点击报名即表示您同意我们的服务条款，我们将保护您的个人信息安全。
      </p>
    </form>
  );
}
