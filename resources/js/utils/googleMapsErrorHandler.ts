export class GoogleMapsErrorHandler {
    static handleMapLoadError(error: any) {
        console.error('Google Maps Load Error:', error);

        // แสดง error message ที่เป็นมิตรกับผู้ใช้
        const errorMessages: { [key: string]: string } = {
            InvalidKeyMapError: 'Google Maps API Key ไม่ถูกต้อง',
            RefererNotAllowedMapError: 'Domain ไม่ได้รับอนุญาต',
            RequestDeniedError: 'คำขอถูกปฏิเสธ',
            OverQueryLimitError: 'เกินขีดจำกัดการใช้งาน',
            NetworkError: 'เกิดปัญหาเกี่ยวกับเครือข่าย',
            UnknownError: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
        };

        const errorType = error.code || error.name || 'UnknownError';
        const message = errorMessages[errorType] || errorMessages['UnknownError'];

        return {
            type: errorType,
            message: message,
            shouldFallback: this.shouldUseFallback(errorType),
        };
    }

    static shouldUseFallback(errorType: string): boolean {
        const fallbackErrors = [
            'InvalidKeyMapError',
            'RefererNotAllowedMapError',
            'OverQueryLimitError',
            'NetworkError',
        ];
        return fallbackErrors.includes(errorType);
    }

    static getRecoveryAction(errorType: string): string {
        const actions: { [key: string]: string } = {
            InvalidKeyMapError: 'กรุณาตรวจสอบ Google Maps API Key',
            RefererNotAllowedMapError: 'กรุณาเพิ่ม domain ในการตั้งค่า API Key',
            OverQueryLimitError: 'กรุณารอสักครู่แล้วลองใหม่อีกครั้ง',
            NetworkError: 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
        };

        return actions[errorType] || 'กรุณาลองใหม่อีกครั้ง';
    }
}
