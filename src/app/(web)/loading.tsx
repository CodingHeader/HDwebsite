export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-[#da251d] rounded-full animate-spin" />
        <p className="mt-4 text-gray-500 text-sm">加载中...</p>
      </div>
    </div>
  );
}
