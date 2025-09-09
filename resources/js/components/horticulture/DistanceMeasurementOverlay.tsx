import React, { useEffect, useRef, useState } from 'react';

interface Coordinate {
    lat: number;
    lng: number;
}

interface DistanceMeasurementOverlayProps {
    map: google.maps.Map | null | undefined;
    isActive: boolean;
    editMode: string | null;
}

const DistanceMeasurementOverlay: React.FC<DistanceMeasurementOverlayProps> = ({
    map,
    isActive,
    editMode,
}) => {
    const [startPoint, setStartPoint] = useState<Coordinate | null>(null);
    const startPointRef = useRef<Coordinate | null>(null);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const polylineRef = useRef<google.maps.Polyline | null>(null);
    const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
    const cleanupFunctionsRef = useRef<(() => void)[]>([]);

    // คำนวณระยะทางระหว่างสองจุด
    const calculateDistance = (point1: Coordinate, point2: Coordinate): number => {
        const R = 6371000; // รัศมีโลกเป็นเมตร
        const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
        const dLng = ((point2.lng - point1.lng) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((point1.lat * Math.PI) / 180) *
                Math.cos((point2.lat * Math.PI) / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // ฟอร์แมตระยะทาง
    const formatDistance = (meters: number): string => {
        if (meters < 1000) {
            return `${meters.toFixed(1)} ม.`;
        } else {
            return `${(meters / 1000).toFixed(2)} กม.`;
        }
    };

    // อัพเดท ref ทุกครั้งที่ startPoint เปลี่ยน
    useEffect(() => {
        startPointRef.current = startPoint;
    }, [startPoint]);

    useEffect(() => {
        // ล้าง listeners และ cleanup functions เก่าก่อน
        listenersRef.current.forEach((listener) => {
            if (listener) {
                google.maps.event.removeListener(listener);
            }
        });
        listenersRef.current = [];

        cleanupFunctionsRef.current.forEach((cleanup) => cleanup());
        cleanupFunctionsRef.current = [];

        if (!map || !isActive || !editMode) {
            // ล้าง InfoWindow และ Polyline เมื่อไม่ active
            if (infoWindowRef.current) {
                infoWindowRef.current.close();
                infoWindowRef.current = null;
            }
            if (polylineRef.current) {
                polylineRef.current.setMap(null);
                polylineRef.current = null;
            }
            setStartPoint(null);
            return;
        }

        // รอให้ map โหลดเสร็จก่อน
        const setupListeners = () => {
            const mapContainer = map.getDiv();
            let isMouseDown = false;
            let mouseDownPos = { x: 0, y: 0 };
            let isDragging = false;

            // ตรวจจับ mousedown
            const mouseDownListener = (e: MouseEvent) => {
                isMouseDown = true;
                mouseDownPos = { x: e.clientX, y: e.clientY };
                isDragging = false;
            };

            // ตรวจจับ mousemove เพื่อดูว่าเป็น drag หรือไม่
            const mouseMoveListener = (e: MouseEvent) => {
                if (isMouseDown) {
                    const deltaX = Math.abs(e.clientX - mouseDownPos.x);
                    const deltaY = Math.abs(e.clientY - mouseDownPos.y);
                    const threshold = 5; // pixel threshold

                    if (deltaX > threshold || deltaY > threshold) {
                        isDragging = true;
                    }
                }
            };

            // ตรวจจับ mouseup/click
            const mouseUpListener = (e: MouseEvent) => {
                if (isMouseDown && !isDragging) {
                    // ตรวจสอบว่าไม่ได้คลิกบนปุ่มเครื่องมือหรือ UI elements
                    const target = e.target as HTMLElement;

                    // ตรวจสอบหลายๆ เงื่อนไขเพื่อให้แน่ใจว่าคลิกบนแผนที่จริงๆ
                    const isClickOnControls =
                        target.closest('.gmnoprint') ||
                        target.closest('[role="button"]') ||
                        target.closest('[data-control-width]') ||
                        target.closest('[jsaction]') ||
                        target.closest('.gm-bundled-control') ||
                        target.closest('.gm-control-active') ||
                        target.style.cursor === 'pointer' ||
                        target.parentElement?.style.cursor === 'pointer';

                    // ตรวจสอบว่าอยู่ในพื้นที่แผนที่จริง
                    const rect = mapContainer.getBoundingClientRect();
                    const isInMainMapArea =
                        e.clientX >= rect.left + 50 && // เผื่อขอบซ้าย
                        e.clientX <= rect.right - 50 && // เผื่อขอบขวา
                        e.clientY >= rect.top + 50 && // เผื่อขอบบน
                        e.clientY <= rect.bottom - 50; // เผื่อขอบล่าง

                    if (isClickOnControls || !isInMainMapArea) {
                        isMouseDown = false;
                        isDragging = false;
                        return;
                    }

                    // ตรวจสอบว่าอยู่ในโหมดที่ควรวัดระยะหรือไม่
                    const drawingModes = [
                        'mainArea',
                        'zone',
                        'exclusion',
                        'mainPipe',
                        'subMainPipe',
                    ];
                    if (!drawingModes.includes(editMode || '')) {
                        return;
                    }

                    // แปลง DOM coordinates เป็น lat/lng
                    const bounds = map.getBounds();
                    if (bounds) {
                        const rect = mapContainer.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;

                        const ne = bounds.getNorthEast();
                        const sw = bounds.getSouthWest();

                        const lng =
                            sw.lng() + (ne.lng() - sw.lng()) * (x / mapContainer.offsetWidth);
                        const lat =
                            ne.lat() - (ne.lat() - sw.lat()) * (y / mapContainer.offsetHeight);

                        const clickedPoint = { lat, lng };

                        if (!startPoint) {
                            setStartPoint(clickedPoint);
                            startPointRef.current = clickedPoint;
                        } else {
                            // รีเซ็ต
                            setStartPoint(null);
                            startPointRef.current = null;
                            if (infoWindowRef.current) {
                                infoWindowRef.current.close();
                                infoWindowRef.current = null;
                            }
                            if (polylineRef.current) {
                                polylineRef.current.setMap(null);
                                polylineRef.current = null;
                            }
                        }
                    }
                }

                // รีเซ็ตสถานะ
                isMouseDown = false;
                isDragging = false;
            };

            // เพิ่ม event listeners
            mapContainer.addEventListener('mousedown', mouseDownListener, true);
            mapContainer.addEventListener('mousemove', mouseMoveListener, true);
            mapContainer.addEventListener('mouseup', mouseUpListener, true);

            const cleanupListeners = () => {
                mapContainer.removeEventListener('mousedown', mouseDownListener, true);
                mapContainer.removeEventListener('mousemove', mouseMoveListener, true);
                mapContainer.removeEventListener('mouseup', mouseUpListener, true);
            };
            cleanupFunctionsRef.current.push(cleanupListeners);

            // ฟัง event เมื่อวาดเสร็จจาก Drawing Manager
            const drawingCompleteListener = google.maps.event.addListener(
                map,
                'overlaycomplete',
                () => {
                    // รีเซ็ตการวัดระยะเมื่อวาดเสร็จ
                    setStartPoint(null);
                    startPointRef.current = null;
                    if (infoWindowRef.current) {
                        infoWindowRef.current.close();
                        infoWindowRef.current = null;
                    }
                    if (polylineRef.current) {
                        polylineRef.current.setMap(null);
                        polylineRef.current = null;
                    }
                }
            );
            listenersRef.current.push(drawingCompleteListener);

            // ฟัง event เมื่อมีการ click ที่ทำให้เสร็จสิ้นการวาด (เช่น double click)
            const doubleClickListener = google.maps.event.addListener(map, 'dblclick', () => {
                // รีเซ็ตการวัดระยะ
                setTimeout(() => {
                    setStartPoint(null);
                    startPointRef.current = null;
                    if (infoWindowRef.current) {
                        infoWindowRef.current.close();
                        infoWindowRef.current = null;
                    }
                    if (polylineRef.current) {
                        polylineRef.current.setMap(null);
                        polylineRef.current = null;
                    }
                }, 100); // รอเล็กน้อยเพื่อให้ drawing complete ก่อน
            });
            listenersRef.current.push(doubleClickListener);

            // ฟัง ESC key เพื่อยกเลิกการวัดระยะ
            const keydownListener = (e: KeyboardEvent) => {
                if (e.key === 'Escape' && startPoint) {
                    setStartPoint(null);
                    startPointRef.current = null;
                    if (infoWindowRef.current) {
                        infoWindowRef.current.close();
                        infoWindowRef.current = null;
                    }
                    if (polylineRef.current) {
                        polylineRef.current.setMap(null);
                        polylineRef.current = null;
                    }
                }
            };
            document.addEventListener('keydown', keydownListener);

            const keyboardCleanup = () => {
                document.removeEventListener('keydown', keydownListener);
            };
            cleanupFunctionsRef.current.push(keyboardCleanup);

            // ใช้ DOM mousemove แทนเพราะ Google Maps mousemove ไม่ทำงาน
            const mapDiv = map.getDiv();
            let frameId: number | null = null;

            const handleMouseMove = (e: MouseEvent) => {
                if (!startPointRef.current) return;

                // ใช้ requestAnimationFrame เพื่อ throttle การอัพเดท
                if (frameId) return;

                frameId = requestAnimationFrame(() => {
                    frameId = null;

                    try {
                        // แปลง mouse position เป็น lat/lng
                        const bounds = map.getBounds();
                        if (!bounds) return;

                        const rect = mapDiv.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;

                        const ne = bounds.getNorthEast();
                        const sw = bounds.getSouthWest();

                        const lng = sw.lng() + (ne.lng() - sw.lng()) * (x / mapDiv.offsetWidth);
                        const lat = ne.lat() - (ne.lat() - sw.lat()) * (y / mapDiv.offsetHeight);

                        const currentPoint = { lat, lng };

                        if (!startPointRef.current) return;

                        const distance = calculateDistance(startPointRef.current, currentPoint);

                        // ซ่อนเส้นสีแดงเพื่อไม่ให้ลายตา (แสดงเฉพาะข้อความระยะทาง)
                        const latLngMouse = new google.maps.LatLng(lat, lng);

                        // ล้างเส้นเก่าถ้ามี
                        if (polylineRef.current) {
                            polylineRef.current.setMap(null);
                            polylineRef.current = null;
                        }

                        // สร้างหรืออัพเดท InfoWindow
                        if (distance > 0) {
                            const content = `
                                <div style="
                                    background: rgba(0,0,0,0.85); 
                                    color: white; 
                                    padding: 8px 12px; 
                                    border-radius: 6px; 
                                    font-size: 14px; 
                                    font-weight: bold;
                                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                                    border: 1px solid rgba(255,255,255,0.2);
                                    text-align: center;
                                    min-width: 60px;
                                ">
                                    ${formatDistance(distance)}
                                    <div style="
                                        font-size: 10px; 
                                        color: rgba(255,255,255,0.8); 
                                        margin-top: 2px;
                                    ">ระยะทาง</div>
                                </div>
                            `;

                            if (infoWindowRef.current) {
                                // อัพเดท InfoWindow ที่มีอยู่
                                infoWindowRef.current.setContent(content);
                                infoWindowRef.current.setPosition(latLngMouse);
                            } else {
                                // สร้าง InfoWindow ใหม่
                                const infoWindow = new google.maps.InfoWindow({
                                    content,
                                    position: latLngMouse,
                                    disableAutoPan: true,
                                    pixelOffset: new google.maps.Size(0, -10),
                                });
                                infoWindow.open(map);
                                infoWindowRef.current = infoWindow;
                            }
                        }
                    } catch (error) {
                        console.error('Error in mousemove handler:', error);
                    }
                });
            };

            mapDiv.addEventListener('mousemove', handleMouseMove);

            const mouseMoveCleanup = () => {
                if (frameId) {
                    cancelAnimationFrame(frameId);
                }
                mapDiv.removeEventListener('mousemove', handleMouseMove);
            };
            cleanupFunctionsRef.current.push(mouseMoveCleanup);
        };

        // ตั้งเวลารอเล็กน้อยเพื่อให้ map โหลดเสร็จ
        const timeoutId = setTimeout(setupListeners, 100);

        return () => {
            clearTimeout(timeoutId);
            // ล้าง listeners
            listenersRef.current.forEach((listener) => {
                if (listener) {
                    google.maps.event.removeListener(listener);
                }
            });
            listenersRef.current = [];

            // ล้าง cleanup functions
            cleanupFunctionsRef.current.forEach((cleanup) => cleanup());
            cleanupFunctionsRef.current = [];

            // ล้าง InfoWindow และ Polyline
            if (infoWindowRef.current) {
                infoWindowRef.current.close();
                infoWindowRef.current = null;
            }
            if (polylineRef.current) {
                polylineRef.current.setMap(null);
                polylineRef.current = null;
            }
        };
    }, [map, isActive, editMode]);

    // รีเซ็ตการวัดระยะเมื่อเปลี่ยน editMode
    useEffect(() => {
        setStartPoint(null);
        startPointRef.current = null;
        if (infoWindowRef.current) {
            infoWindowRef.current.close();
            infoWindowRef.current = null;
        }
        if (polylineRef.current) {
            polylineRef.current.setMap(null);
            polylineRef.current = null;
        }
    }, [editMode]);

    return null;
};

export default DistanceMeasurementOverlay;
