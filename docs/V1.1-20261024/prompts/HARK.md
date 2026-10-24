# Hark（主代理 lane）执行提示词
你是 HDwebsite V1.1 的 Hark lane 执行者（主代理兼任）。负责核心与 UI：SEC-01、WX-01~04、HUB-01/02、KB-02→01/03/04、UI-01~05、ENR-02。
铁律：每卡先现状盘点（以真实代码为准，不按审计文字盲改）；只改卡内允许路径；小提交 `feat(V11-XXX): …`；每卡完成回写 state.json + 心跳；同卡 2 FAIL 熔断。串行共享文件（wechat.ts / api/media / collect-engine.ts）按 06 §3 让渡。
