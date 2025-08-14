import React, { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useLanguage } from '../../contexts/LanguageContext';
import Navbar from '../../components/Navbar';

interface IrrigationGenerateProps {
	crops?: string;
}

export default function IrrigationGenerate({ crops }: IrrigationGenerateProps) {
	const { t } = useLanguage();
	const [selectedCrops, setSelectedCrops] = useState<string[]>([]);

	useEffect(() => {
		if (crops) {
			setSelectedCrops(crops.split(',').filter((c) => c.trim()));
		}
	}, [crops]);

	const handleBack = () => {
		router.get('/pipe-generate', { crops: selectedCrops.join(',') });
	};

	const handleFinish = () => {
		router.get('/field-crop-summary', { crops: selectedCrops.join(',') });
	};

	return (
		<>
			<Head title={t('Irrigation System')} />
			
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
									{t('Back to Pipe System')}
								</button>
								
								<h1 className="text-lg font-bold text-white mb-1">
									{t('Step 4: Irrigation System')}
								</h1>
								<p className="text-sm text-gray-400">
									{t('Configure irrigation methods and schedules')}
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

									{/* Irrigation Types */}
									<div className="bg-gray-700 rounded-lg p-4">
										<h3 className="text-sm font-semibold text-white mb-3">
											{t('Irrigation Types')}
										</h3>
										<div className="grid grid-cols-2 gap-2">
											<div className="bg-gray-600 rounded p-2 text-center hover:bg-gray-500 cursor-pointer transition-colors">
												<div className="text-lg mb-1">💧</div>
												<h4 className="text-xs font-medium text-white">{t('Sprinkler')}</h4>
												<p className="text-xs text-gray-400">{t('Wide coverage')}</p>
											</div>
											
											<div className="bg-gray-600 rounded p-2 text-center hover:bg-gray-500 cursor-pointer transition-colors">
												<div className="text-lg mb-1">🌊</div>
												<h4 className="text-xs font-medium text-white">{t('Mini Sprinkler')}</h4>
												<p className="text-xs text-gray-400">{t('Medium coverage')}</p>
											</div>
											
											<div className="bg-gray-600 rounded p-2 text-center hover:bg-gray-500 cursor-pointer transition-colors">
												<div className="text-lg mb-1">🌦️</div>
												<h4 className="text-xs font-medium text-white">{t('Micro Spray')}</h4>
												<p className="text-xs text-gray-400">{t('Precise application')}</p>
											</div>
											
											<div className="bg-gray-600 rounded p-2 text-center hover:bg-gray-500 cursor-pointer transition-colors">
												<div className="text-lg mb-1">💧</div>
												<h4 className="text-xs font-medium text-white">{t('Drip System')}</h4>
												<p className="text-xs text-gray-400">{t('Water efficient')}</p>
											</div>
										</div>
									</div>

									{/* Irrigation Settings */}
									<div className="bg-gray-700 rounded-lg p-4">
										<h3 className="text-sm font-semibold text-white mb-3">
											{t('Irrigation Settings')}
										</h3>
										
										{/* Sprinkler Settings */}
										<div className="bg-gray-600 rounded p-3 mb-3">
											<h4 className="font-medium text-white mb-2 text-sm">{t('Sprinkler Settings')}</h4>
											<div className="space-y-2">
												<div>
													<label className="block text-xs text-gray-400 mb-1">
														{t('Coverage Radius')} (m)
													</label>
													<input
														type="number"
														placeholder="8"
														className="w-full rounded border border-gray-500 bg-gray-700 px-2 py-1 text-white text-xs focus:border-blue-500 focus:outline-none"
													/>
												</div>
												<div>
													<label className="block text-xs text-gray-400 mb-1">
														{t('Overlap Coverage')} (%)
													</label>
													<input
														type="number"
														placeholder="30"
														className="w-full rounded border border-gray-500 bg-gray-700 px-2 py-1 text-white text-xs focus:border-blue-500 focus:outline-none"
													/>
												</div>
											</div>
										</div>

										{/* Drip System Settings */}
										<div className="bg-gray-600 rounded p-3">
											<h4 className="font-medium text-white mb-2 text-sm">{t('Drip System Settings')}</h4>
											<div className="space-y-2">
												<div>
													<label className="block text-xs text-gray-400 mb-1">
														{t('Emitter Spacing')} (cm)
													</label>
													<input
														type="number"
														placeholder="30"
														className="w-full rounded border border-gray-500 bg-gray-700 px-2 py-1 text-white text-xs focus:border-blue-500 focus:outline-none"
													/>
												</div>
												<div>
													<label className="block text-xs text-gray-400 mb-1">
														{t('Flow Rate')} (L/h)
													</label>
													<input
														type="number"
														placeholder="4"
														className="w-full rounded border border-gray-500 bg-gray-700 px-2 py-1 text-white text-xs focus:border-blue-500 focus:outline-none"
													/>
												</div>
											</div>
										</div>
									</div>

									{/* Zone-Irrigation Assignment */}
									<div className="bg-gray-700 rounded-lg p-4">
										<h3 className="text-sm font-semibold text-white mb-3">
											{t('Zone-Irrigation Assignment')}
										</h3>
										<div className="bg-gray-600 rounded p-3">
											<div className="text-xs text-gray-400 text-center py-4">
												{t('No zones configured yet')}
											</div>
										</div>
									</div>

									{/* Irrigation Generation */}
									<div className="bg-gray-700 rounded-lg p-4">
										<h3 className="text-sm font-semibold text-white mb-3">
											{t('Generate Irrigation')}
										</h3>
										<div className="space-y-2">
											<button className="w-full bg-green-600 text-white px-3 py-2 rounded text-xs hover:bg-green-700 transition-colors">
												{t('Auto Generate All Zones')}
											</button>
											<button className="w-full bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700 transition-colors">
												{t('Generate Selected Zones')}
											</button>
											<button className="w-full bg-orange-600 text-white px-3 py-2 rounded text-xs hover:bg-orange-700 transition-colors">
												{t('Manual Placement')}
											</button>
											<button className="w-full bg-red-600 text-white px-3 py-2 rounded text-xs hover:bg-red-700 transition-colors">
												{t('Clear All Irrigation')}
											</button>
										</div>
									</div>

									{/* Irrigation Summary */}
									<div className="bg-gray-700 rounded-lg p-4">
										<h3 className="text-sm font-semibold text-white mb-3">
											{t('Irrigation Summary')}
										</h3>
										<div className="grid grid-cols-2 gap-2 text-center">
											<div className="bg-gray-600 rounded p-2">
												<div className="text-lg font-bold text-blue-400">--</div>
												<div className="text-xs text-gray-400">{t('Sprinklers')}</div>
											</div>
											
											<div className="bg-gray-600 rounded p-2">
												<div className="text-lg font-bold text-green-400">--</div>
												<div className="text-xs text-gray-400">{t('Mini Sprinklers')}</div>
											</div>
											
											<div className="bg-gray-600 rounded p-2">
												<div className="text-lg font-bold text-yellow-400">--</div>
												<div className="text-xs text-gray-400">{t('Micro Sprays')}</div>
											</div>
											
											<div className="bg-gray-600 rounded p-2">
												<div className="text-lg font-bold text-purple-400">--</div>
												<div className="text-xs text-gray-400">{t('Drip Points')}</div>
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
										onClick={handleFinish}
										className="flex-1 px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
									>
										{t('Finish')}
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
