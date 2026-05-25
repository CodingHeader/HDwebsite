"use client";

interface CompanyIntroProps {
  videoUrl?: string;
  introText: string;
  slogan?: string;
  showOverlay?: boolean;
}

export function CompanyIntro({
  videoUrl,
  introText,
  slogan,
  showOverlay = true,
}: CompanyIntroProps) {
  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {showOverlay && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 border-l-4 border-red-600 pl-3">
              公司简介
            </h2>
            {slogan && (
              <p className="text-gray-500">{slogan}</p>
            )}
          </div>
        )}

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：视频 */}
          <div className="rounded-lg overflow-hidden bg-gray-900">
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                className="w-full aspect-video"
                poster="/images/video-poster.jpg"
              >
                您的浏览器不支持视频播放
              </video>
            ) : (
              <div className="aspect-video bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="text-6xl font-bold mb-2">不忘初心</div>
                  <div className="text-4xl">感恩同行</div>
                  <div className="mt-4 text-lg">凝聚力量 携手前行 共创佳绩</div>
                </div>
              </div>
            )}
          </div>

          {showOverlay && (
            <div className="flex flex-col justify-center">
              <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed space-y-4">
                {introText.split("\n\n").map((paragraph, index) => (
                  <p key={index} className="text-justify">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
