import html2canvas, { Options } from 'html2canvas';

/**
 * Helper function for html2canvas with oklch compatibility
 * Converts oklch colors to hex/rgb before capturing
 */
export const captureElementAsImage = async (
    element: HTMLElement,
    options: {
        scale?: number;
        backgroundColor?: string;
        useCORS?: boolean;
        allowTaint?: boolean;
        foreignObjectRendering?: boolean;
        imageTimeout?: number;
        removeContainer?: boolean;
        ignoreElements?: (element: Element) => boolean;
        onclone?: (clonedDoc: Document) => void;
    } = {}
): Promise<string> => {
    // Default options optimized for compatibility
    const defaultOptions = {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: true,
        imageTimeout: 15000,
        removeContainer: true,
        ...options,
    };

    // Clone the element to avoid modifying the original
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Apply html2canvas compatibility styles
    const applyCompatibilityStyles = (el: HTMLElement) => {
        // Force background colors to hex/rgb
        const style = el.style;
        if (style.backgroundColor && style.backgroundColor.includes('oklch')) {
            // Convert oklch to hex (approximate)
            if (style.backgroundColor.includes('oklch(1 0 0)')) {
                style.backgroundColor = '#ffffff';
            } else if (style.backgroundColor.includes('oklch(0.145 0 0)')) {
                style.backgroundColor = '#252525';
            }
        }

        // Ensure all children also have compatible colors
        const allElements = el.querySelectorAll('*');
        allElements.forEach((child) => {
            const childStyle = (child as HTMLElement).style;
            if (childStyle.backgroundColor && childStyle.backgroundColor.includes('oklch')) {
                if (childStyle.backgroundColor.includes('oklch(1 0 0)')) {
                    childStyle.backgroundColor = '#ffffff';
                } else if (childStyle.backgroundColor.includes('oklch(0.145 0 0)')) {
                    childStyle.backgroundColor = '#252525';
                }
            }
        });
    };

    // Apply compatibility styles to cloned element
    applyCompatibilityStyles(clonedElement);

    // Create a temporary container
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = element.offsetWidth + 'px';
    tempContainer.style.height = element.offsetHeight + 'px';
    tempContainer.style.overflow = 'hidden';
    tempContainer.appendChild(clonedElement);

    // Add to document temporarily
    document.body.appendChild(tempContainer);

    try {
        // Capture the cloned element
        const canvas = await html2canvas(clonedElement, defaultOptions);
        const dataUrl = canvas.toDataURL('image/png');
        return dataUrl;
    } finally {
        // Clean up
        if (tempContainer.parentNode) {
            tempContainer.parentNode.removeChild(tempContainer);
        }
    }
};

/**
 * Enhanced html2canvas function with better error handling
 */
export const enhancedHtml2Canvas = async (
    element: HTMLElement,
    options: Partial<Options> = {}
): Promise<HTMLCanvasElement> => {
    const defaultOptions: Partial<Options> = {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: true,
        imageTimeout: 15000,
        removeContainer: true,
        logging: false,
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
        return await html2canvas(element, finalOptions);
    } catch (error) {
        console.error('html2canvas error:', error);
        
        // Fallback: try with more basic options
        const fallbackOptions: Partial<Options> = {
            scale: 1,
            useCORS: false,
            allowTaint: true,
            foreignObjectRendering: false,
        };
        
        return await html2canvas(element, fallbackOptions);
    }
};

/**
 * Convert PDF with proper image handling
 */
export const convertToPDF = async (
    element: HTMLElement,
    filename: string,
    options: {
        orientation?: 'portrait' | 'landscape';
        unit?: 'pt' | 'mm' | 'cm' | 'in';
        format?: string;
    } = {}
): Promise<void> => {
    const { jsPDF } = await import('jspdf');
    
    try {
        const canvas = await enhancedHtml2Canvas(element);
        const img = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4',
            ...options,
        });
        
        const w = pdf.internal.pageSize.getWidth();
        const h = pdf.internal.pageSize.getHeight();
        
        pdf.addImage(img, 'PNG', 0, 0, w, h);
        pdf.save(filename);
    } catch (error) {
        console.error('PDF conversion error:', error);
        throw error;
    }
};

/**
 * Download image directly
 */
export const downloadImage = async (
    element: HTMLElement,
    filename: string,
    format: 'png' | 'jpeg' = 'png'
): Promise<void> => {
    try {
        const canvas = await enhancedHtml2Canvas(element);
        const dataUrl = canvas.toDataURL(`image/${format}`);
        
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Image download error:', error);
        throw error;
    }
}; 