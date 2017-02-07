declare module "ui/styling/style" {
    import { Length, PercentLength, Color, Background, Font, ViewBase, Observable, BackgroundRepeat, Visibility, HorizontalAlignment, VerticalAlignment} from "ui/core/view";
    import { TextAlignment, TextDecoration, TextTransform, WhiteSpace } from "ui/text-base";
    import { FontStyle, FontWeight } from "ui/styling/font";

    export interface Thickness {
        left: number;
        top: number;
        right: number;
        bottom: number;
    }

    export interface BorderColor {
        top: Color;
        right: Color;
        bottom: Color;
        left: Color;
    }

    export interface CommonLayoutParams {
        width: number;
        height: number;

        widthPercent: number;
        heightPercent: number;

        leftMargin: number;
        topMargin: number;
        rightMargin: number;
        bottomMargin: number;

        leftMarginPercent: number;
        topMarginPercent: number;
        rightMarginPercent: number;
        bottomMarginPercent: number;

        horizontalAlignment: HorizontalAlignment;
        verticalAlignment: VerticalAlignment;
    }

    export class Style extends Observable {

        public fontInternal: Font;
        public backgroundInternal: Background;

        public rotate: number;
        public scaleX: number;
        public scaleY: number;
        public translateX: Length;
        public translateY: Length;

        public clipPath: string;
        public color: Color;
        public tintColor: Color;
        public placeholderColor: Color;

        public backgroundColor: Color;
        public backgroundImage: string;
        public backgroundRepeat: BackgroundRepeat;
        public backgroundSize: string;
        public backgroundPosition: string;

        public borderColor: string | Color;
        public borderTopColor: Color;
        public borderRightColor: Color;
        public borderBottomColor: Color;
        public borderLeftColor: Color;
        public borderWidth: string | Length;
        public borderTopWidth: Length;
        public borderRightWidth: Length;
        public borderBottomWidth: Length;
        public borderLeftWidth: Length;
        public borderRadius: string | Length;
        public borderTopLeftRadius: Length;
        public borderTopRightRadius: Length;
        public borderBottomRightRadius: Length;
        public borderBottomLeftRadius: Length;

        public fontSize: number;
        public fontFamily: string;
        public fontStyle: FontStyle;
        public fontWeight: FontWeight;
        public font: string;

        public zIndex: number;
        public opacity: number;
        public visibility: Visibility;

        public letterSpacing: number;
        public textAlignment: TextAlignment;
        public textDecoration: TextDecoration;
        public textTransform: TextTransform;
        public whiteSpace: WhiteSpace;

        public minWidth: Length;
        public minHeight: Length;
        public width: PercentLength;
        public height: PercentLength;
        public margin: string | PercentLength;
        public marginLeft: PercentLength;
        public marginTop: PercentLength;
        public marginRight: PercentLength;
        public marginBottom: PercentLength;
        public padding: string | Length;
        public paddingLeft: Length;
        public paddingTop: Length;
        public paddingRight: Length;
        public paddingBottom: Length;
        public horizontalAlignment: HorizontalAlignment;
        public verticalAlignment: VerticalAlignment;

        // TabView-specific props
        public tabTextColor: Color;
        public tabBackgroundColor: Color;
        public selectedTabTextColor: Color;
        public androidSelectedTabHighlightColor: Color;

        // ListView-specific props 
        public separatorColor: Color;

        //SegmentedBar-specific props
        public selectedBackgroundColor: Color;

        // Page-specific props 
        public statusBarStyle: string;
        public androidStatusBarBackground: Color;

        constructor(ownerView: ViewBase);
        public view: ViewBase;

        // public _beginUpdate();
        // public _endUpdate();
        // public _resetCssValues(): void;
        // public _syncNativeProperties(): void;
        // public _inheritStyleProperty(property: Property): void;
        // public _inheritStyleProperties(parent: View): void;
        // public _boundsChanged(): void;
        // public _updateTextDecoration(): void;
        // public _updateTextTransform(): void;
        // public _sizeChanged(): void;
    }

    // export function registerNoStylingClass(className);
    // export function getHandler(property: Property, view: View): StylePropertyChangedHandler;
    // Property registration

    // /**
    //  * Represents an object that defines how style property should be applied on a native view/widget.
    //  */
    // export class StylePropertyChangedHandler {
    //     /**
    //      * Creates a new StylePropertyChangedHandler object.
    //      * @param applyCallback - called when a property value should be applied onto the native view/widget.
    //      * @param resetCallback - called when the property value is cleared to restore the native view/widget in its original state. The callback
    //      * also receives as a parameter the value stored by the getNativeValue callback.
    //      * @param getNativeValue - called when a style property is set for the first time to get the default native value for this property
    //      * in the native view/widget. This value will be passed to resetCallback in case the property value is cleared. Optional.
    //      */
    //     constructor(applyCallback: (view: View, newValue: any) => void,
    //         resetCallback: (view: View, nativeValue: any) => void,
    //         getNativeValue?: (view: View) => any);
    // }

    // /**
    //  * Represents a sceleton for an object that holds all style related callbacks and registers handlers.
    //  * Used for better code readability.
    //  */
    // export class Styler {
    //     public static registerHandlers();
    // }

    // /**
    //  * A function that actually registers a property with a StylePropertyChangedHandler.
    //  * @param property - Usually a style dependency property which should be registered for style changes.
    //  * @param handler - The handler that reacts on property changes.
    //  * @param className(optional) - This parameter (when set) registers handler only for the class with that name and all its inheritors.
    //  */
    // export function registerHandler(property: Property, handler: StylePropertyChangedHandler, className?: string);

    // export var ignorePropertyHandler;
}
