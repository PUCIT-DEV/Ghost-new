import React, {useEffect, useRef, useState} from 'react';

interface UseDynamicSVGImportOptions {
    onCompleted?: (
        name: string,
        SvgIcon: React.FC<React.SVGProps<SVGSVGElement>> | undefined
    ) => void;
    onError?: (err: Error) => void;
}

function useDynamicSVGImport(
    name: string,
    options: UseDynamicSVGImportOptions = {}
) {
    const ImportedIconRef = useRef<React.FC<React.SVGProps<SVGSVGElement>>>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error>();

    const {onCompleted, onError} = options;
    useEffect(() => {
        setLoading(true);
        const importIcon = async (): Promise<void> => {
            try {
                ImportedIconRef.current = (
                    await import(`../../assets/icons/${name}.svg`)
                ).ReactComponent;
                onCompleted?.(name, ImportedIconRef.current);
            } catch (err: any) {
                onError?.(err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        importIcon();
    }, [name, onCompleted, onError]);

    return {error, loading, SvgIcon: ImportedIconRef.current};
}

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

interface IconProps {
    name: string;

    /**
     * Accepts either predefined sizes or number, in which case the size means the pixel width & height
     */
    size?: IconSize;

    /**
     * Accepts all colors available in the actual TailwindCSS theme, e.g. `black`, `green-100`
     */
    color?: string;
    styles?: string;
    className?: string;
}

/**
 * Icon guidelines:
 * - all icons must be SVG's
 * - all icons must have all it's children color value set `currentColor`
 * - all strokes must be paths and _NOT_ outlined objects. Stroke width should be set to 1.5px
 */
const Icon: React.FC<IconProps> = ({name, size = 'md', color = 'black', className}) => {
    const {SvgIcon} = useDynamicSVGImport(name);

    let styles = '';

    if (!styles) {
        switch (size) {
        case 'xs':
            styles = 'w-3 h-3';
            break;
        case 'sm':
            styles = 'w-4 h-4';
            break;
        case 'lg':
            styles = 'w-8 h-8';
            break;
        case 'xl':
            styles = 'w-10 h-10';
            break;
        
        default:
            styles = 'w-5 h-5';
            break;
        }
    }

    if (color) {
        styles += ` text-${color}`;
    }

    if (SvgIcon) {       
        return (
            <SvgIcon className={`${styles} ${className}`} />
        );
    }
    return null;
};

export default Icon;