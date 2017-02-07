import { WrappedValue } from "data/observable";
import { ViewBase } from "./view-base";
import { Style } from "ui/styling/style";
import * as definitions from "ui/core/view-base";

export { Style };

export const unsetValue: any = new Object();

let symbolPropertyMap = {};
let cssSymbolPropertyMap = {};

let cssSymbolResetMap = {};

let inheritableProperties = new Array<InheritedProperty<any, any>>();
let inheritableCssProperties = new Array<InheritedCssProperty<any, any>>();

function print(map) {
    let symbols = (<any>Object).getOwnPropertySymbols(map);
    for (let symbol of symbols) {
        const prop = map[symbol];
        if (!prop.registered) {
            console.log(`Property ${prop.name} not Registered!!!!!`);
        }
    }
}

export function _isSet(cssProperty: CssProperty<any, any>, instance: Style): boolean {
    return cssProperty.sourceKey in instance;
}

export function _printUnregisteredProperties(): void {
    print(symbolPropertyMap);
    print(cssSymbolPropertyMap);
}

const enum ValueSource {
    Default = 0,
    Inherited = 1,
    Css = 2,
    Local = 3,
    Keyframe = 4
}

export class Property<T extends ViewBase, U> implements TypedPropertyDescriptor<U>, definitions.Property<T, U> {
    private registered: boolean;

    public readonly name: string;
    public readonly key: symbol;
    public readonly native: symbol;
    public readonly defaultValueKey: symbol;
    public readonly defaultValue: U;
    public readonly nativeValueChange: (owner: T, value: U) => void;

    public get: () => U;
    public set: (value: U) => void;
    public enumerable: boolean = true;
    public configurable: boolean = true;

    constructor(options: definitions.PropertyOptions<T, U>) {
        const name = options.name;
        this.name = name;

        const key = Symbol(name + ":propertyKey");
        this.key = key;

        const native: symbol = Symbol(name + ":nativeKey");
        this.native = native;

        const defaultValueKey = Symbol(name + ":nativeDefaultValue");
        this.defaultValueKey = defaultValueKey;

        const defaultValue: U = options.defaultValue;
        this.defaultValue = defaultValue;

        const eventName = name + "Change";
        const equalityComparer = options.equalityComparer;
        const affectsLayout: boolean = options.affectsLayout;
        const valueChanged = options.valueChanged;
        const valueConverter = options.valueConverter;

        this.set = function (this: T, value: U): void {
            const reset = value === unsetValue;
            let unboxedValue: U;
            let wrapped: boolean;
            if (reset) {
                unboxedValue = defaultValue;
            } else {
                wrapped = value && (<any>value).wrapped;
                unboxedValue = wrapped ? WrappedValue.unwrap(value) : value;

                if (valueConverter && typeof unboxedValue === "string") {
                    unboxedValue = valueConverter(unboxedValue);
                }
            }

            const currentValue = key in this ? this[key] : defaultValue;
            const changed: boolean = equalityComparer ? !equalityComparer(currentValue, unboxedValue) : currentValue !== unboxedValue;

            if (wrapped || changed) {
                const setNativeValue = this.nativeView && native in this;
                if (reset) {
                    delete this[key];
                    if (valueChanged) {
                        valueChanged(this, currentValue, unboxedValue);
                    }
                    if (setNativeValue) {
                        this[native] = this[defaultValueKey];
                        delete this[defaultValueKey];
                    }
                } else {
                    this[key] = unboxedValue;
                    if (valueChanged) {
                        valueChanged(this, currentValue, unboxedValue);
                    }

                    if (setNativeValue) {
                        if (!(defaultValueKey in this)) {
                            this[defaultValueKey] = this[native];
                        }

                        this[native] = unboxedValue;
                    }
                }

                if (this.hasListeners(eventName)) {
                    this.notify({
                        eventName: eventName,
                        propertyName: name,
                        object: this,
                        value: unboxedValue
                    });
                }

                if (affectsLayout) {
                    this.requestLayout();
                }
            }
        };

        this.get = function (this: T): U {
            return key in this ? this[key] : defaultValue;
        };

        this.nativeValueChange = function (owner: T, value: U): void {
            const currentValue = key in owner ? owner[key] : defaultValue;
            const changed = equalityComparer ? !equalityComparer(currentValue, value) : currentValue !== value;
            if (changed) {
                owner[key] = value;
                if (valueChanged) {
                    valueChanged(owner, currentValue, value);
                }

                if (owner.hasListeners(eventName)) {
                    owner.notify({
                        eventName: eventName,
                        propertyName: name,
                        object: owner,
                        value: value
                    });
                }

                if (affectsLayout) {
                    owner.requestLayout();
                }
            }
        };

        symbolPropertyMap[key] = this;
    }

    public register(cls: { prototype: T }): void {
        if (this.registered) {
            throw new Error(`Property ${this.name} already registered.`);
        }
        this.registered = true;
        Object.defineProperty(cls.prototype, this.name, this);
    }
}

export class CoercibleProperty<T extends ViewBase, U> extends Property<T, U> implements definitions.CoercibleProperty<T, U> {
    public readonly coerce: (target: T) => void;

    constructor(options: definitions.CoerciblePropertyOptions<T, U>) {
        super(options);

        const name = options.name;
        const key = this.key;
        const native: symbol = this.native;
        const defaultValueKey = this.defaultValueKey;
        const defaultValue: U = this.defaultValue;

        const coerceKey = Symbol(name + ":coerceKey");

        const eventName = name + "Change";
        const affectsLayout: boolean = options.affectsLayout;
        const equalityComparer = options.equalityComparer;
        const valueChanged = options.valueChanged;
        const valueConverter = options.valueConverter;
        const coerceCallback = options.coerceValue;

        this.coerce = function (target: T): void {
            const originalValue: U = coerceKey in target ? target[coerceKey] : defaultValue;
            // need that to make coercing but also fire change events
            target[name] = originalValue;
        }

        this.set = function (this: T, value: U): void {
            const reset = value === unsetValue;
            let unboxedValue: U;
            let wrapped: boolean;
            if (reset) {
                unboxedValue = defaultValue;
                delete this[coerceKey];
            } else {
                wrapped = value && (<any>value).wrapped;
                unboxedValue = wrapped ? WrappedValue.unwrap(value) : value;

                if (valueConverter && typeof unboxedValue === "string") {
                    unboxedValue = valueConverter(unboxedValue);
                }

                this[coerceKey] = unboxedValue;
                unboxedValue = coerceCallback(this, unboxedValue);
            }

            const currentValue = key in this ? this[key] : defaultValue;
            const changed: boolean = equalityComparer ? !equalityComparer(currentValue, unboxedValue) : currentValue !== unboxedValue;

            if (wrapped || changed) {
                const setNativeValue = this.nativeView && native in this;
                if (reset) {
                    delete this[key];
                    if (valueChanged) {
                        valueChanged(this, currentValue, unboxedValue);
                    }

                    if (setNativeValue) {
                        this[native] = this[defaultValueKey];
                        delete this[defaultValueKey];
                    }
                } else {
                    this[key] = unboxedValue;
                    if (valueChanged) {
                        valueChanged(this, currentValue, unboxedValue);
                    }

                    if (setNativeValue) {
                        if (!(defaultValueKey in this)) {
                            this[defaultValueKey] = this[native];
                        }

                        this[native] = unboxedValue;
                    }
                }

                if (this.hasListeners(eventName)) {
                    this.notify({
                        eventName: eventName,
                        propertyName: name,
                        object: this,
                        value: unboxedValue
                    });
                }

                if (affectsLayout) {
                    this.requestLayout();
                }
            }
        }
    }
}

export class InheritedProperty<T extends ViewBase, U> extends Property<T, U> implements definitions.InheritedProperty<T, U> {
    public readonly sourceKey: symbol;
    public readonly setInheritedValue: (value: U) => void;

    constructor(options: definitions.PropertyOptions<T, U>) {
        super(options);
        const name = options.name;
        const key = this.key;
        const defaultValue = options.defaultValue;

        const sourceKey = Symbol(name + ":valueSourceKey");
        this.sourceKey = sourceKey;

        const setBase = this.set;
        const setFunc = (valueSource: ValueSource) => function (value: U): void {
            const that = <T>this;

            let unboxedValue: U;
            let newValueSource: number;

            if (value === unsetValue) {
                // If unsetValue - we want to reset the property.
                const parent: ViewBase = that.parent;
                // If we have parent and it has non-default value we use as our inherited value.
                if (parent && parent[sourceKey] !== ValueSource.Default) {
                    unboxedValue = parent[name];
                    newValueSource = ValueSource.Inherited;
                }
                else {
                    unboxedValue = defaultValue;
                    newValueSource = ValueSource.Default;
                }
            } else {
                // else we are set through property set.
                unboxedValue = value;
                newValueSource = valueSource;
            }

            // take currentValue before calling base - base may change it.
            const currentValue = that[key];
            setBase.call(that, unboxedValue);

            const newValue = that[key];
            that[sourceKey] = newValueSource;

            if (currentValue !== newValue) {
                const reset = newValueSource === ValueSource.Default;
                that.eachChild((child) => {
                    const childValueSource = child[sourceKey] || ValueSource.Default;
                    if (reset) {
                        if (childValueSource === ValueSource.Inherited) {
                            setFunc.call(child, unsetValue);
                        }
                    } else {
                        if (childValueSource <= ValueSource.Inherited) {
                            setInheritedValue.call(child, newValue);
                        }
                    }
                    return true;
                });
            }
        };

        const setInheritedValue = setFunc(ValueSource.Inherited);
        this.setInheritedValue = setInheritedValue;

        this.set = setFunc(ValueSource.Local);

        inheritableProperties.push(this);
    }
}

export class CssProperty<T extends Style, U> implements definitions.CssProperty<T, U> {
    private registered: boolean;

    public readonly name: string;
    public readonly cssName: string;
    public readonly cssLocalName: string;

    protected readonly cssValueDescriptor: PropertyDescriptor;
    protected readonly localValueDescriptor: PropertyDescriptor;

    public readonly key: symbol;
    public readonly native: symbol;
    public readonly sourceKey: symbol;
    public readonly defaultValueKey: symbol;
    public readonly defaultValue: U;

    constructor(options: definitions.CssPropertyOptions<T, U>) {
        const name = options.name;
        this.name = name;

        this.cssName = `css:${options.cssName}`;
        this.cssLocalName = options.cssName;

        const key = Symbol(name + ":propertyKey");
        this.key = key;

        const sourceKey = Symbol(name + ":valueSourceKey");
        this.sourceKey = sourceKey;

        const native = Symbol(name + ":nativeKey");
        this.native = native;

        const defaultValueKey = Symbol(name + ":nativeDefaultValue");
        this.defaultValueKey = defaultValueKey;

        const defaultValue: U = options.defaultValue;
        this.defaultValue = defaultValue;

        const eventName = name + "Change";
        const affectsLayout: boolean = options.affectsLayout;
        const equalityComparer = options.equalityComparer;
        const valueChanged = options.valueChanged;
        const valueConverter = options.valueConverter;

        function setLocalValue(this: T, value: U): void {
            const reset = value === unsetValue;
            if (reset) {
                value = defaultValue;
                delete this[sourceKey];
            }
            else {
                this[sourceKey] = ValueSource.Local;
                if (valueConverter && typeof value === "string") {
                    value = valueConverter(value);
                }
            }

            const currentValue: U = key in this ? this[key] : defaultValue;
            const changed: boolean = equalityComparer ? !equalityComparer(currentValue, value) : currentValue !== value;

            if (changed) {
                const view = this.view;
                const setNativeValue = view.nativeView && native in view;
                if (reset) {
                    delete this[key];
                    if (valueChanged) {
                        valueChanged(this, currentValue, value);
                    }

                    if (setNativeValue) {
                        view[native] = this[defaultValueKey];
                        delete this[defaultValueKey];
                    }
                } else {
                    this[key] = value;
                    if (valueChanged) {
                        valueChanged(this, currentValue, value);
                    }

                    if (setNativeValue) {
                        if (!(defaultValueKey in this)) {
                            this[defaultValueKey] = view[native];
                        }

                        view[native] = value;
                    }
                }

                if (this.hasListeners(eventName)) {
                    this.notify({
                        eventName: eventName,
                        propertyName: name,
                        object: this,
                        value: value
                    });
                }

                if (affectsLayout) {
                    view.requestLayout();
                }
            }
        }

        function setCssValue(this: T, value: U): void {
            const reset = value === unsetValue;
            const currentValueSource: number = this[sourceKey] || ValueSource.Default;

            // We have localValueSource - NOOP.
            if (currentValueSource === ValueSource.Local) {
                return;
            }

            if (reset) {
                value = defaultValue;
                delete this[sourceKey];
            } else {
                if (valueConverter && typeof value === "string") {
                    value = valueConverter(value);
                }
                this[sourceKey] = ValueSource.Css;
            }

            const currentValue: U = key in this ? this[key] : defaultValue;
            const changed: boolean = equalityComparer ? !equalityComparer(currentValue, value) : currentValue !== value;

            if (changed) {
                const view = this.view;
                const setNativeValue = view.nativeView && native in view;
                if (reset) {
                    delete this[key];
                    if (valueChanged) {
                        valueChanged(this, currentValue, value);
                    }

                    if (setNativeValue) {
                        view[native] = this[defaultValueKey];
                        delete this[defaultValueKey];
                    }
                } else {
                    this[key] = value;
                    if (valueChanged) {
                        valueChanged(this, currentValue, value);
                    }

                    if (setNativeValue) {
                        if (!(defaultValueKey in this)) {
                            this[defaultValueKey] = view[native];
                        }

                        view[native] = value;
                    }
                }

                if (this.hasListeners(eventName)) {
                    this.notify({
                        eventName: eventName,
                        propertyName: name,
                        object: this,
                        value: value
                    });
                }

                if (affectsLayout) {
                    view.requestLayout();
                }
            }
        }

        function get(): U {
            return key in this ? this[key] : defaultValue;
        }

        this.cssValueDescriptor = {
            enumerable: true,
            configurable: true,
            get: get,
            set: setCssValue
        };

        this.localValueDescriptor = {
            enumerable: true,
            configurable: true,
            get: get,
            set: setLocalValue
        };

        cssSymbolPropertyMap[key] = this;
    }

    public register(cls: { prototype: T }): void {
        if (this.registered) {
            throw new Error(`Property ${this.name} already registered.`);
        }
        this.registered = true;
        Object.defineProperty(cls.prototype, this.name, this.localValueDescriptor);
        Object.defineProperty(cls.prototype, this.cssName, this.cssValueDescriptor);
        if (this.cssLocalName !== this.cssName) {
            Object.defineProperty(cls.prototype, this.cssLocalName, this.localValueDescriptor);
        }
    }
}

interface CssAnimationPropertyOptions<T, U> {
    readonly name: string;
    readonly cssName?: string;
    readonly inherited?: boolean;
    readonly defaultValue?: U;
    readonly affectsLayout?: boolean;
    readonly equalityComparer?: (x: U, y: U) => boolean;
    readonly valueChanged?: (target: T, oldValue: U, newValue: U) => void;
    readonly valueConverter?: (value: string) => U;
}

export class CssAnimationProperty<T extends Style, U> {
    public readonly name: string;
    public readonly cssName: string;

    public readonly native: symbol;
    public readonly register: (cls: { prototype }) => void;

    public readonly keyframe: string;
    public readonly defaultValueKey: symbol;

    constructor(private options: CssAnimationPropertyOptions<T, U>) {
        const { inherited, valueConverter, equalityComparer, valueChanged, affectsLayout } = options;
        const propertyName = options.name;
        this.name = propertyName;
        this.cssName = (options.cssName || propertyName);

        const cssName = "css:" + (options.cssName || propertyName);
        const keyframeName = "keyframe:" + propertyName;
        this.keyframe = keyframeName;
        const defaultName = "default:" + propertyName;

        const defaultValueKey = Symbol(defaultName);
        this.defaultValueKey = defaultValueKey;

        const cssValue = Symbol(cssName);
        const styleValue = Symbol(propertyName);
        const keyframeValue = Symbol(keyframeName);
        const computedValue = Symbol("computed-value:" + propertyName);
        const computedSource = Symbol("computed-source:" + propertyName);

        const native = this.native = Symbol("native:" + propertyName);
        const eventName = propertyName + "Change";

        function descriptor(symbol: symbol, propertySource: ValueSource, enumerable: boolean, configurable: boolean, getsComputed: boolean): PropertyDescriptor {
            return { enumerable, configurable,
                get: getsComputed ? function(this: T) { return this[computedValue]; } : function(this: T) { return this[symbol]; },
                set(this: T, value: U) {
                    let prev = this[computedValue];
                    if (value === unsetValue) {
                        this[symbol] = unsetValue;
                        if (this[computedSource] >= propertySource) {
                            if (this[styleValue] !== unsetValue) {
                                this[computedSource] = ValueSource.Local;
                                this[computedValue] = this[styleValue];
                            } else if (this[cssValue] !== unsetValue) {
                                this[computedSource] = ValueSource.Css;
                                this[computedValue] = this[cssValue];
                                // TODO: else if inherited, get from parent
                            } else {
                                delete this[computedSource];
                                delete this[computedValue];
                            }
                        }
                    } else {
                        if (valueConverter && typeof value === "string") {
                            value = valueConverter(value);
                        }
                        this[symbol] = value;
                        if (this[computedSource] <= propertySource) {
                            this[computedSource] = propertySource;
                            this[computedValue] = value;
                            // TODO: If this is inherited, notify children
                        }
                    }
                    let next = this[computedValue];
                    if (prev !== next && (!equalityComparer || !equalityComparer(prev, next))) {
                        valueChanged && valueChanged(this, prev, next);
                        this.view.nativeView && (this.view[native] = next);
                        this.hasListeners(eventName) && this.notify({ eventName, object: this, propertyName, value });
                        affectsLayout && this.view.requestLayout();
                    }
                }
            }
        }

        const defaultPropertyDescriptor = descriptor(defaultValueKey, ValueSource.Default, false, false, false);
        const cssPropertyDescriptor = descriptor(cssValue, ValueSource.Css, false, false, false);
        const stylePropertyDescriptor = descriptor(styleValue, ValueSource.Local, true, true, true);
        const keyframePropertyDescriptor = descriptor(keyframeValue, ValueSource.Keyframe, false, false, false);

        cssSymbolResetMap[cssValue] = cssName;
        cssSymbolResetMap[keyframeValue] = keyframeName;

        symbolPropertyMap[computedValue] = this;

        this.register = (cls: { prototype: T }) => {
            cls.prototype[defaultValueKey] = options.defaultValue;
            cls.prototype[computedValue] = options.defaultValue;
            cls.prototype[computedSource] = ValueSource.Default;

            cls.prototype[cssValue] = unsetValue;
            cls.prototype[styleValue] = unsetValue;
            cls.prototype[keyframeValue] = unsetValue;

            Object.defineProperty(cls.prototype, defaultName, defaultPropertyDescriptor);
            Object.defineProperty(cls.prototype, cssName, cssPropertyDescriptor);
            Object.defineProperty(cls.prototype, propertyName, stylePropertyDescriptor);
            Object.defineProperty(cls.prototype, keyframeName, keyframePropertyDescriptor);
        }
    }
}

export class InheritedCssProperty<T extends Style, U> extends CssProperty<T, U> implements definitions.InheritedCssProperty<T, U> {
    public setInheritedValue: (value: U) => void;

    constructor(options: definitions.CssPropertyOptions<T, U>) {
        super(options);
        const name = options.name;

        const key = this.key;
        const sourceKey = this.sourceKey;
        const native = this.native;
        const defaultValueKey = this.defaultValueKey;

        const eventName = name + "Change";
        const defaultValue: U = options.defaultValue;
        const affectsLayout: boolean = options.affectsLayout;
        const equalityComparer = options.equalityComparer;
        const valueChanged = options.valueChanged;
        const valueConverter = options.valueConverter;

        const setFunc = (valueSource: ValueSource) => function (this: T, value: any): void {
            const reset = value === unsetValue;
            const currentValueSource: number = this[sourceKey] || ValueSource.Default;
            if (reset) {
                // If we want to reset cssValue and we have localValue - return;
                if (valueSource === ValueSource.Css && currentValueSource === ValueSource.Local) {
                    return;
                }
            } else {
                if (currentValueSource > valueSource) {
                    return;
                }
            }

            const view = this.view;
            let newValue: U;
            if (reset) {
                // If unsetValue - we want to reset this property.
                let parent = view.parent;
                let style = parent ? parent.style : null;
                // If we have parent and it has non-default value we use as our inherited value.
                if (style && style[sourceKey] > ValueSource.Default) {
                    newValue = style[name];
                    this[sourceKey] = ValueSource.Inherited;
                }
                else {
                    newValue = defaultValue;
                    delete this[sourceKey];
                }
            } else {
                this[sourceKey] = valueSource;
                if (valueConverter && typeof value === "string") {
                    newValue = valueConverter(value);
                } else {
                    newValue = value;
                }
            }

            const currentValue: U = key in this ? this[key] : defaultValue;
            const changed: boolean = equalityComparer ? !equalityComparer(currentValue, newValue) : currentValue !== newValue;

            if (changed) {
                const view = this.view;
                const setNativeValue = view.nativeView && native in view;
                if (reset) {
                    delete this[key];
                    if (valueChanged) {
                        valueChanged(this, currentValue, newValue);
                    }

                    if (setNativeValue) {
                        view[native] = this[defaultValueKey];
                        delete this[defaultValueKey];
                    }
                } else {
                    this[key] = newValue;
                    if (valueChanged) {
                        valueChanged(this, currentValue, newValue);
                    }

                    if (setNativeValue) {
                        if (!(defaultValueKey in this)) {
                            this[defaultValueKey] = view[native];
                        }

                        view[native] = newValue;
                    }
                }

                if (this.hasListeners(eventName)) {
                    this.notify({
                        eventName: eventName,
                        propertyName: name,
                        object: this,
                        value: newValue
                    });
                }

                if (affectsLayout) {
                    view.requestLayout();
                }

                view.eachChild((child) => {
                    const childStyle = child.style;
                    const childValueSource = childStyle[sourceKey] || ValueSource.Default;
                    if (reset) {
                        if (childValueSource === ValueSource.Inherited) {
                            setDefaultFunc.call(childStyle, unsetValue);
                        }
                    } else {
                        if (childValueSource <= ValueSource.Inherited) {
                            setInheritedFunc.call(childStyle, newValue);
                        }
                    }
                    return true;
                });
            }
        };

        const setDefaultFunc = setFunc(ValueSource.Default);
        const setInheritedFunc = setFunc(ValueSource.Inherited);

        this.setInheritedValue = setInheritedFunc;
        this.cssValueDescriptor.set = setFunc(ValueSource.Css);
        this.localValueDescriptor.set = setFunc(ValueSource.Local);

        inheritableCssProperties.push(this);
    }
}

export class ShorthandProperty<T extends Style, P> implements definitions.ShorthandProperty<T, P> {
    private registered: boolean;

    public readonly key: symbol;
    public readonly name: string;
    public readonly cssName: string;
    public readonly cssLocalName: string;

    protected readonly cssValueDescriptor: PropertyDescriptor;
    protected readonly localValueDescriptor: PropertyDescriptor;

    public readonly native: symbol;
    public readonly sourceKey: symbol;

    constructor(options: definitions.ShorthandPropertyOptions<P>) {
        this.name = options.name;

        const key = Symbol(this.name + ":propertyKey");
        this.key = key;

        this.cssName = `css:${options.cssName}`;
        this.cssLocalName = `${options.cssName}`;

        const converter = options.converter;

        function setLocalValue(this: T, value: string | P): void {
            if (this[key] !== value) {
                this[key] = value;
                for (let [p, v] of converter(value)) {
                    this[p.name] = v;
                }
            }
        }

        function setCssValue(this: T, value: string): void {
            if (this[key] !== value) {
                this[key] = value;
                for (let [p, v] of converter(value)) {
                    this[p.cssName] = v;
                }
            }
        }

        this.cssValueDescriptor = {
            enumerable: true,
            configurable: true,
            get: options.getter,
            set: setCssValue
        };

        this.localValueDescriptor = {
            enumerable: true,
            configurable: true,
            get: options.getter,
            set: setLocalValue
        };

        cssSymbolPropertyMap[key] = this;
    }

    public register(cls: { prototype: T }): void {
        if (this.registered) {
            throw new Error(`Property ${this.name} already registered.`);
        }
        this.registered = true;
        Object.defineProperty(cls.prototype, this.name, this.localValueDescriptor);
        Object.defineProperty(cls.prototype, this.cssName, this.cssValueDescriptor);
        if (this.cssLocalName !== this.cssName) {
            Object.defineProperty(cls.prototype, this.cssLocalName, this.localValueDescriptor);
        }
    }
}

function inheritablePropertyValuesOn(view: ViewBase): Array<{ property: InheritedProperty<any, any>, value: any }> {
    const array = new Array<{ property: InheritedProperty<any, any>, value: any }>();
    for (let prop of inheritableProperties) {
        const sourceKey = prop.sourceKey;
        const valueSource: number = view[sourceKey] || ValueSource.Default;
        if (valueSource !== ValueSource.Default) {
            // use prop.name as it will return value or default value.
            // prop.key will return undefined if property is set t the same value as default one.
            array.push({ property: prop, value: view[prop.name] });
        }
    }

    return array;
}

function inheritableCssPropertyValuesOn(style: Style): Array<{ property: InheritedCssProperty<any, any>, value: any }> {
    const array = new Array<{ property: InheritedCssProperty<any, any>, value: any }>();
    for (let prop of inheritableCssProperties) {
        const sourceKey = prop.sourceKey;
        const valueSource: number = style[sourceKey] || ValueSource.Default;
        if (valueSource !== ValueSource.Default) {
            // use prop.name as it will return value or default value.
            // prop.key will return undefined if property is set t the same value as default one.
            array.push({ property: prop, value: style[prop.name] });
        }
    }

    return array;
}

export function initNativeView(view: ViewBase): void {
    let symbols = (<any>Object).getOwnPropertySymbols(view);
    for (let symbol of symbols) {
        const property: Property<any, any> = symbolPropertyMap[symbol];
        if (!property) {
            continue;
        }

        const native = property.native;
        if (native in view) {
            const defaultValueKey = property.defaultValueKey;
            if (!(defaultValueKey in view)) {
                view[defaultValueKey] = view[native];
            }

            const value = view[symbol];
            view[native] = value;
        }
    }

    const style = view.style;
    symbols = (<any>Object).getOwnPropertySymbols(style);
    for (let symbol of symbols) {
        const property: CssProperty<any, any> = cssSymbolPropertyMap[symbol];
        if (!property) {
            continue;
        }

        const native = property.native;
        if (native in view) {
            const defaultValueKey = property.defaultValueKey;
            if (!(defaultValueKey in style)) {
                style[defaultValueKey] = view[native];
            }

            const value = style[symbol];
            view[native] = value;
        }
    }
}

export function resetNativeView(view: ViewBase): void {
    let symbols = (<any>Object).getOwnPropertySymbols(view);
    for (let symbol of symbols) {
        const property: Property<any, any> = symbolPropertyMap[symbol];
        if (!property) {
            continue;
        }

        const native = property.native;
        if (native in view) {
            view[native] = view[property.defaultValueKey];
            delete view[property.defaultValueKey];
        }

        // This will not call propertyChange!!!
        delete view[property.key];
    }

    const style = view.style;

    symbols = (<any>Object).getOwnPropertySymbols(style);
    for (let symbol of symbols) {
        const property: CssProperty<any, any> = cssSymbolPropertyMap[symbol];
        if (!property) {
            continue;
        }

        const native = property.native;
        if (native in view) {
            view[native] = style[property.defaultValueKey];
            delete style[property.defaultValueKey];
        }

        // This will not call propertyChange!!!
        delete style[property.key];
    }
}

export function clearInheritedProperties(view: ViewBase): void {
    for (let prop of inheritableProperties) {
        const sourceKey = prop.sourceKey;
        if (view[sourceKey] === ValueSource.Inherited) {
            prop.set.call(view, unsetValue);
        }
    }

    const style = view.style;
    for (let prop of inheritableCssProperties) {
        const sourceKey = prop.sourceKey;
        if (style[sourceKey] === ValueSource.Inherited) {
            prop.setInheritedValue.call(style, unsetValue);
        }
    }
}

export function resetCSSProperties(style: Style): void {
    let symbols = (<any>Object).getOwnPropertySymbols(style);
    for (let symbol of symbols) {
        let cssProperty;
        if (cssProperty = cssSymbolPropertyMap[symbol]) {
            style[cssProperty.cssName] = unsetValue;
        } else if (cssProperty = cssSymbolResetMap[symbol]) {
            style[cssProperty] = unsetValue;
        }
    }
}

export function propagateInheritedProperties(view: ViewBase): void {
    const inheritablePropertyValues = inheritablePropertyValuesOn(view);
    const inheritableCssPropertyValues = inheritableCssPropertyValuesOn(view.style);
    if (inheritablePropertyValues.length === 0 && inheritableCssPropertyValues.length === 0) {
        return;
    }

    view.eachChild((child) => {
        for (let pair of inheritablePropertyValues) {
            const prop = pair.property;
            const sourceKey = prop.sourceKey;
            const currentValueSource: number = child[sourceKey] || ValueSource.Default;
            if (currentValueSource <= ValueSource.Inherited) {
                prop.setInheritedValue.call(child, pair.value);
            }
        }

        for (let pair of inheritableCssPropertyValues) {
            const prop = pair.property;
            const sourceKey = prop.sourceKey;
            const style = child.style;
            const currentValueSource: number = style[sourceKey] || ValueSource.Default;
            if (currentValueSource <= ValueSource.Inherited) {
                prop.setInheritedValue.call(style, pair.value, ValueSource.Inherited);
            }
        }
        return true;
    });
}

export function makeValidator<T>(...values: T[]): (value: any) => value is T {
    const set = new Set(values);
    return (value: any): value is T => set.has(value);
}

export function makeParser<T>(isValid: (value: any) => boolean): (value: any) => T {
    return value => {
        const lower = value && value.toLowerCase();
        if (isValid(lower)) {
            return lower;
        } else {
            throw new Error("Invalid value: " + value);
        }
    };
}
