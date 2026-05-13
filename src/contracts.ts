declare const i18nKindBrand: unique symbol;
declare const i18nValuesBrand: unique symbol;
declare const i18nComponentsBrand: unique symbol;

/**
 * 插值变量表，键名会用于约束消息中必须出现的 `{{key}}` 占位符。
 */
export type I18nValues = Record<string, unknown>;

/**
 * 富文本组件表，键名会用于约束消息中必须出现的 `<key></key>` 标签。
 */
export type I18nComponents = Record<string, unknown>;

/**
 * 将多个模板字面量约束合并成一个交叉类型，用来表达“所有 key 都必须出现”。
 */
type UnionToIntersection<T> = (
  T extends unknown
    ? (value: T) => void
    : never
) extends (value: infer Intersection) => void
  ? Intersection
  : never;

/**
 * 根据插值变量表生成文本模式约束。
 * 例如 `{ name: string }` 会要求字符串中包含 `{{name}}`。
 */
type InterpolationPattern<Values> = [keyof Values & string] extends [never]
  ? string
  : UnionToIntersection<
      {
        [Key in keyof Values & string]: `${string}{{${Key}}}${string}`;
      }[keyof Values & string]
    >;

/**
 * 根据组件表生成富文本标签约束。
 * 例如 `{ link: unknown }` 会要求字符串中包含 `<link></link>`。
 */
type RichComponentPattern<Components> = [keyof Components & string] extends [
  never,
]
  ? string
  : UnionToIntersection<
      {
        [Key in keyof Components &
          string]: `${string}<${Key}>${string}</${Key}>${string}`;
      }[keyof Components & string]
    >;

/**
 * 普通文本消息类型，可选声明必须出现的插值变量。
 */
export type I18nText<Values extends I18nValues | undefined = undefined> = ([
  Values,
] extends [undefined]
  ? string
  : InterpolationPattern<Values>) & {
  readonly [i18nKindBrand]?: "text";
  readonly [i18nValuesBrand]?: Values;
};

/**
 * 富文本消息类型，可选声明必须出现的插值变量和组件标签。
 */
export type I18nRich<
  Values extends I18nValues | undefined = undefined,
  Components extends I18nComponents | undefined = undefined,
> = ([Values] extends [undefined] ? string : InterpolationPattern<Values>) &
  ([Components] extends [undefined]
    ? string
    : RichComponentPattern<Components>) & {
    readonly [i18nKindBrand]?: "rich";
    readonly [i18nValuesBrand]?: Values;
    readonly [i18nComponentsBrand]?: Components;
  };

/**
 * `I18nText` 的兼容别名。
 */
export type TextMessage<Values extends I18nValues | undefined = undefined> =
  I18nText<Values>;

/**
 * `I18nRich` 的兼容别名。
 */
export type RichMessage<
  Values extends I18nValues | undefined = undefined,
  Components extends I18nComponents | undefined = undefined,
> = I18nRich<Values, Components>;
