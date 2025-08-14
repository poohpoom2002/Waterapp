import React, { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useLanguage } from '../../contexts/LanguageContext';
import Navbar from '../../components/Navbar';

interface ZoneObstacleProps {
	crops?: string;
}

export default function ZoneObstacle({ crops }: ZoneObstacleProps) {
	const { t } = useLanguage();
	const [selectedCrops, setSelectedCrops] = useState<string[]>([]);

	useEffect(() => {
		if (crops) {
			setSelectedCrops(crops.split(',').filter((c) => c.trim()));
		}
	}, [crops]);

	const handleBack = () => {
		router.get('/initial-area', { crops: selectedCrops.join(',') });
	};

	const handleContinue = () => {
		router.get('/pipe-generate', { crops: selectedCrops.join(',') });
	};

	return (
		<>
			<Head title={t('Zones & Obstacles')} />
			
			<div className="min-h-screen bg-gray-900 text-white overflow-hidden">
				{/* Navbar */}
				<Navbar />
				
				<div className="h-[calc(100vh-4rem)] overflow-hidden">
					<div className="flex h-full">
						{/* Left Side - Control Panel */}
						<div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
							{/* Header */}
							<div className="p-4 border-b border-gray-700">
								<button
									onClick={handleBack}
									className="mb-3 flex items-center text-blue-400 hover:text-blue-300 text-sm"
								>
									<svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
									</svg>
									{t('Back to Initial Area')}
								</button>
								
								<h1 className="text-lg font-bold text-white mb-1">
									{t('Step 2: Zones & Obstacles')}
								</h1>
								<p className="text-sm text-gray-400">
									{t('Define zones and obstacles for your field')}
								</p>
							</div>

							{/* Scrollable Content */}
							<div className="flex-1 overflow-y-auto">
								<div className="p-4 space-y-6">
									
									{/* Selected Crops Display */}
									{selectedCrops.length > 0 && (
										<div className="bg-gray-700 rounded-lg p-4">
											<h3 className="text-sm font-semibold text-white mb-3">
												{t('Selected Crops')}
											</h3>
											<div className="flex flex-wrap gap-2">
												{selectedCrops.map((crop, idx) => (
													<span key={idx} className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
														{crop}
													</span>
												))}
											</div>
										</div>
									)}

									{/* Zone Management */}
									<div className="bg-gray-700 rounded-lg p-4">
										<h3 className="text-sm font-semibold text-white mb-3">
											{t('Zone Management')}
										</h3>
										<div className="space-y-3">
											<div className="bg-gray-600 rounded p-3">
												<h4 className="font-medium text-white mb-2 text-sm">{t('Zone Drawing')}</h4>
												<p className="text-xs text-gray-400 mb-3">
													{t('Draw custom zones on the map')}
												</p>
												<button className="w-full bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700 transition-colors">
													{t('Start Drawing Zones')}
												</button>
											</div>
											
											<div className="bg-gray-600 rounded p-3">
												<h4 className="font-medium text-white mb-2 text-sm">{t('Auto Zone Creation')}</h4>
												<p className="text-xs text-gray-400 mb-3">
													{t('Automatically divide field into zones')}
												</p>
												<button className="w-full bg-green-600 text-white px-3 py-2 rounded text-xs hover:bg-green-700 transition-colors">
													{t('Auto Generate Zones')}
												</button>
											</div>
										</div>
									</div>

									{/* Obstacle Management */}
									<div className="bg-gray-700 rounded-lg p-4">
										<h3 className="text-sm font-semibold text-white mb-3">
											{t('Obstacle Management')}
										</h3>
										<div className="grid grid-cols-2 gap-2">
											<div className="bg-gray-600 rounded p-2 text-center hover:bg-gray-500 cursor-pointer transition-colors">
												<div className="text-lg mb-1">🏠</div>
												<div className="text-xs font-medium">{t('Building')}</div>
											</div>
											
											<div className="bg-gray-600 rounded p-2 text-center hover:bg-gray-500 cursor-pointer transition-colors">
												<div className="text-lg mb-1">🌊</div>
												<div className="text-xs font-medium">{t('Water Source')}</div>
											</div>
											
											<div className="bg-gray-600 rounded p-2 text-center hover:bg-gray-500 cursor-pointer transition-colors">
												<div className="text-lg mb-1">⛰️</div>
												<div className="text-xs font-medium">{t('Rock')}</div>
											</div>
											
											<div className="bg-gray-600 rounded p-2 text-center hover:bg-gray-500 cursor-pointer transition-colors">
												<div className="text-lg mb-1">🌳</div>
												<div className="text-xs font-medium">{t('Tree')}</div>
											</div>
										</div>
									</div>

									{/* Zone-Crop Assignment */}
									<div className="bg-gray-700 rounded-lg p-4">
										<h3 className="text-sm font-semibold text-white mb-3">
											{t('Zone-Crop Assignment')}
										</h3>
										<div className="bg-gray-600 rounded p-3">
											<h4 className="font-medium text-white mb-2 text-sm">{t('Assignment Preview')}</h4>
											<div className="space-y-1 text-xs text-gray-400">
												<div className="flex justify-between">
													<span>{t('Total Zones')}:</span>
													<span>-- {t('zones')}</span>
												</div>
												<div className="flex justify-between">
													<span>{t('Assigned Zones')}:</span>
													<span>-- {t('zones')}</span>
												</div>
												<div className="flex justify-between">
													<span>{t('Available Crops')}:</span>
													<span>{selectedCrops.length} {t('types')}</span>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Bottom Action Buttons */}
							<div className="p-4 border-t border-gray-700">
								<div className="flex gap-2">
									<button 
										onClick={handleBack}
										className="flex-1 px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-500 transition-colors"
									>
										{t('Back')}
									</button>
									
									<button 
										onClick={handleContinue}
										className="flex-1 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
									>
										{t('Next')}
									</button>
								</div>
							</div>
						</div>

						{/* Right Side - Google Map */}
						<div className="flex-1 relative">
							<div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
								{/* Google Map Placeholder */}
								<div className="text-center">
									<div className="text-6xl mb-4">🗺️</div>
									<h3 className="text-xl font-semibold text-gray-300 mb-2">
										Google Map Area
									</h3>
									<p className="text-gray-500">
										Interactive map will be loaded here
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
