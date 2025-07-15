import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ProfilePhotoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPhotoUploaded: (photoUrl: string) => void;
    currentPhotoUrl?: string;
}

export default function ProfilePhotoModal({ 
    isOpen, 
    onClose, 
    onPhotoUploaded, 
    currentPhotoUrl 
}: ProfilePhotoModalProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        width: 90,
        height: 90,
        x: 5,
        y: 5,
    });
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string>('');
    const imgRef = useRef<HTMLImageElement>(null);

    const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setError('');
            
            // Create preview URL
            const reader = new FileReader();
            reader.onload = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        const crop: Crop = {
            unit: '%',
            width: 90,
            height: 90,
            x: 5,
            y: 5,
        };
        setCrop(crop);
    }, []);

    const getCroppedImg = useCallback(
        (image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('No 2d context');
            }

            const scaleX = image.naturalWidth / image.width;
            const scaleY = image.naturalHeight / image.height;

            canvas.width = crop.width;
            canvas.height = crop.height;

            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(
                image,
                crop.x * scaleX,
                crop.y * scaleY,
                crop.width * scaleX,
                crop.height * scaleY,
                0,
                0,
                crop.width,
                crop.height
            );

            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    }
                }, 'image/jpeg', 0.9);
            });
        },
        []
    );

    const handleUpload = async () => {
        if (!selectedFile || !completedCrop || !imgRef.current) {
            setError('Please select an image and crop it');
            return;
        }

        setIsUploading(true);
        setError('');

        try {
            const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop);
            
            const formData = new FormData();
            formData.append('photo', croppedImageBlob, 'profile-photo.jpg');
            
            if (completedCrop) {
                formData.append('crop_data[x]', completedCrop.x.toString());
                formData.append('crop_data[y]', completedCrop.y.toString());
                formData.append('crop_data[width]', completedCrop.width.toString());
                formData.append('crop_data[height]', completedCrop.height.toString());
            }

            const response = await fetch('/api/profile-photo/upload', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            const result = await response.json();

            if (result.success) {
                onPhotoUploaded(result.photo_url);
                onClose();
                setSelectedFile(null);
                setPreviewUrl('');
                setCrop({ unit: '%', width: 90, height: 90, x: 5, y: 5 });
                setCompletedCrop(undefined);
            } else {
                setError(result.message || 'Upload failed');
            }
        } catch (err) {
            setError('Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!currentPhotoUrl) return;

        setIsUploading(true);
        setError('');

        try {
            const response = await fetch('/api/profile-photo/delete', {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();

            if (result.success) {
                onPhotoUploaded('');
                onClose();
            } else {
                setError(result.message || 'Delete failed');
            }
        } catch (err) {
            setError('Delete failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
            <div className="relative z-[10000] mx-4 w-full max-w-2xl rounded-lg bg-gray-800 p-6">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-white">Upload Profile Photo</h3>
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-gray-700 p-2 text-gray-400 transition-colors hover:bg-gray-600 hover:text-white"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-900/30 border border-red-500 p-3 text-red-400">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Choose Photo
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={onSelectFile}
                            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                        />
                    </div>

                    {/* Image Preview and Crop */}
                    {previewUrl && (
                        <div className="space-y-4">
                            <div className="text-sm text-gray-300">Crop your photo (drag to move, resize corners)</div>
                            <div className="max-h-96 overflow-auto rounded-lg border border-gray-600">
                                <ReactCrop
                                    crop={crop}
                                    onChange={(c) => setCrop(c)}
                                    onComplete={(c) => setCompletedCrop(c)}
                                    aspect={1}
                                    minWidth={100}
                                    minHeight={100}
                                >
                                    <img
                                        ref={imgRef}
                                        alt="Crop preview"
                                        src={previewUrl}
                                        onLoad={onImageLoad}
                                        className="max-w-full"
                                    />
                                </ReactCrop>
                            </div>
                        </div>
                    )}

                    {/* Current Photo */}
                    {currentPhotoUrl && !previewUrl && (
                        <div className="space-y-4">
                            <div className="text-sm text-gray-300">Current Profile Photo</div>
                            <div className="flex items-center space-x-4">
                                <img
                                    src={currentPhotoUrl}
                                    alt="Current profile"
                                    className="h-20 w-20 rounded-full object-cover"
                                />
                                <button
                                    onClick={handleDelete}
                                    disabled={isUploading}
                                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                                >
                                    {isUploading ? 'Deleting...' : 'Remove Photo'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Upload Progress */}
                    {isUploading && (
                        <div className="space-y-2">
                            <div className="text-sm text-gray-300">Uploading...</div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="rounded-lg bg-gray-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        {selectedFile && (
                            <button
                                onClick={handleUpload}
                                disabled={isUploading || !completedCrop}
                                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isUploading ? 'Uploading...' : 'Upload Photo'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 