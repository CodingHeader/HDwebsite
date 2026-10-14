/**
 * 管理端标准组件库（P07）入口：页面层只从这里与 @/components/manager/* 取组件，不直接写原生控件。
 * 作用域：全部依赖 [data-theme="manager"] 令牌；前台（web）继续使用 src/components/ui/* 的 main 原样组件，互不影响。
 */
export { Button, IconButton, LinkButton, buttonClass } from "./button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./button";
export { Input, Textarea, Select, Checkbox, Switch, SearchField, controlClass } from "./input";
export type { SelectOption } from "./input";
export { Label, FormField } from "./form-field";
export type { FieldA11y } from "./form-field";
export { Dialog, Drawer } from "./dialog";
export { Badge, Card, CardHeader, Kbd, Separator, SectionTitle, Tabs, HelpCallout } from "./misc";
export type { BadgeTone, TabItem } from "./misc";
export { toast } from "@/components/manager/feedback/toast";
