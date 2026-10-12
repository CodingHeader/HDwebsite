# P02 视觉回归 diff 表（upgrade :6789 vs main 参照 :6790）

生成：2026-10-12，`VISUAL_SAVE_ACTUAL=1 npm run test:visual` 后逐像素比对（任一通道差>0 即计为差异像素）。阈值 maxDiffPixelRatio ≤ 0.01。

注：375 视口的整页截图宽 667px 是 main 本身在 375 下的横向溢出（参照与实际一致，属 main 原样行为，未修改）。

| 截图 | 尺寸 | 差异像素比 | 结果 |
| --- | --- | --- | --- |
| about-1440.png | 1440x1950 | 0.00000 | PASS |
| about-375.png | 667x3750 | 0.00000 | PASS |
| about-768.png | 768x2478 | 0.00000 | PASS |
| apply-1440.png | 1440x1460 | 0.00000 | PASS |
| apply-375.png | 667x2580 | 0.00000 | PASS |
| apply-768.png | 768x2184 | 0.00000 | PASS |
| article-detail-1440.png | 1440x1445 | 0.00043 | PASS |
| article-detail-375.png | 667x1985 | 0.00073 | PASS |
| article-detail-768.png | 768x1741 | 0.00102 | PASS |
| articles-1440.png | 1440x2696 | 0.00035 | PASS |
| articles-375.png | 667x4062 | 0.00053 | PASS |
| articles-768.png | 768x3170 | 0.00068 | PASS |
| campus-1440.png | 1440x1506 | 0.00000 | PASS |
| campus-375.png | 667x2086 | 0.00000 | PASS |
| campus-768.png | 768x1741 | 0.00000 | PASS |
| contact-1440.png | 1440x1616 | 0.00000 | PASS |
| contact-375.png | 667x2892 | 0.00000 | PASS |
| contact-768.png | 768x2012 | 0.00000 | PASS |
| course-detail-1440.png | 1440x1445 | 0.00004 | PASS |
| course-detail-375.png | 667x2173 | 0.00005 | PASS |
| course-detail-768.png | 768x1773 | 0.00006 | PASS |
| courses-1440.png | 1440x1748 | 0.00092 | PASS |
| courses-375.png | 667x4000 | 0.00086 | PASS |
| courses-768.png | 768x2334 | 0.00128 | PASS |
| gallery-1440.png | 1440x2454 | 0.00000 | PASS |
| gallery-375.png | 667x4776 | 0.00000 | PASS |
| gallery-768.png | 768x2906 | 0.00000 | PASS |
| home-1440.png | 1440x5529 | 0.00057 | PASS |
| home-375.png | 667x8923 | 0.00236 | PASS |
| home-768.png | 768x6297 | 0.00007 | PASS |
| learning-1440.png | 1440x1612 | 0.00035 | PASS |
| learning-375.png | 667x3172 | 0.00008 | PASS |
| learning-768.png | 768x1808 | 0.00027 | PASS |
| not-found-1440.png | 1440x900 | 0.00000 | PASS |
| not-found-375.png | 375x812 | 0.00000 | PASS |
| not-found-768.png | 768x1024 | 0.00000 | PASS |
| partners-1440.png | 1440x1834 | 0.00007 | PASS |
| partners-375.png | 667x4741 | 0.00174 | PASS |
| partners-768.png | 768x2735 | 0.00009 | PASS |
| party-1440.png | 1440x1842 | 0.00007 | PASS |
| party-375.png | 667x3294 | 0.00008 | PASS |
| party-768.png | 768x2062 | 0.00012 | PASS |
| service-detail-1440.png | 1440x1667 | 0.00005 | PASS |
| service-detail-375.png | 667x2883 | 0.00007 | PASS |
| service-detail-768.png | 768x2173 | 0.00008 | PASS |

最大值：home-375 0.236%；45/45 ≤1%。Playwright：46 passed（45 截图 + 1 区块顺序断言），EXIT 0。
