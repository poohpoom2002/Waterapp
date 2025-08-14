import React, { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useLanguage } from '../../contexts/LanguageContext';
import Navbar from '../../components/Navbar';

interface PipeGenerateProps {
	crops?: string;
}

export default function PipeGenerate({ crops }: PipeGenerateProps) {
	const { t } = useLanguage();
	const [selectedCrops, setSelectedCrops] = useState<string[]>([]);

	useEffect(() => {
		if (crops) {
			setSelectedCrops(crops.split(',').filter((c) => c.trim()));
		}
	}, [crops]);

	const handleBack = () => {
		router.get('/zone-obstacle', { crops: selectedCrops.join(',') });
	};

	const handleContinue = () => {
		router.get('/irrigation-generate', { crops: selectedCrops.join(',') });
	};

	return (
		<>
			<Head title={t('Pipe System')} />
			
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
									{t('Back to Zones & Obstacles')}
								</button>
								
								<h1 className="text-lg font-bold text-white mb-1">
									{t('Step 3: Pipe System')}
								</h1>
								<p className="text-sm text-gray-400">
									{t('Design the pipe network for your field')}
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

									{/* Pipe Types */}
									<div className="bg-gray-700 rounded-lg p-4">
										<h3 className="text-sm font-semibold text-white mb-3">
											{t('Pipe Types')}
										</h3>
										<div className="space-y-3">
											<div className="bg-gray-600 rounded p-3">
												<div className="flex items-center mb-2">
													<div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
													<h4 className="font-medium text-white text-sm">{t('Main Pipe')}</h4>
												</div>
												<p className="text-xs text-gray-400 mb-2">
													{t('Primary water distribution pipe from source')}
												</p>
												<button className="w-full bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700 transition-colors">
													{t('Draw Main Pipe')}
												</button>
											</div>
											
											<div className="bg-gray-600 rounded p-3">
												<div className="flex items-center mb-2">
													<div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
													<h4 className="font-medium text-white text-sm">{t('Sub Main Pipe')}</h4>
												</div>
												<p className="text-xs text-gray-400 mb-2">
													{t('Secondary pipes connecting to zones')}
												</p>
												<button className="w-full bg-green-600 text-white px-3 py-2 rounded text-xs hover:bg-green-700 transition-colors">
													{t('Draw Sub Main Pipe')}
												</button>
											</div>
											
											<div className="bg-gray-600 rounded p-3">
												<div className="flex items-center mb-2">
													<div className="w-3 h-3 bg-orange-600 rounded-full mr-2"></div>
													<h4 className="font-medium text-white text-sm">{t('Lateral Pipe')}</h4>
												</div>
												<p className="text-xs text-gray-400 mb-2">
													{t('Detailed pipes within each zone')}
												</p>
												<button className="w-full bg-orange-600 text-white px-3 py-2 rounded text-xs hover:bg-orange-700 transition-colors">
													{t('Generate Lateral Pipes')}
												</button>
											</div>
										</div>
									</div>

									{/* Pipe Layout Options */}
									<div className="bg-gray-700 rounded-lg p-4">
										<h3 className="text-sm font-semibold text-white mb-3">
											{t('Pipe Layout Options')}
										</h3>
										<div className="space-y-2">
											<button className="w-full bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 transition-colors">
												{t('Manual Drawing')}
											</button>
											<button className="w-full bg-cyan-600 text-white px-3 py-2 rounded text-sm hover:bg-cyan-700 transition-colors">
												{t('Auto Generate')}
											</button>
										</div>
									</div>

									{/* Pipe Specifications */}
									<div className="bg-gray-700 rounded-lg p-4">
										<h3 className="text-sm font-semibold text-white mb-3">
											{t('Pipe Specifications')}
										</h3>
										<div className="space-y-3">
											<div>
												<label className="block text-xs text-gray-400 mb-1">
													{t('Main Pipe Diameter (mm)')}
												</label>
												<select className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none">
													<option value="50">50mm</option>
													<option value="75">75mm</option>
													<option value="100">100mm</option>
													<option value="150">150mm</option>
												</select>
											</div>
											
											<div>
												<label className="block text-xs text-gray-400 mb-1">
													{t('Sub Main Pipe Diameter (mm)')}
												</label>
												<select className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none">
													<option value="32">32mm</option>
													<option value="40">40mm</option>
													<option value="50">50mm</option>
													<option value="75">75mm</option>
												</select>
											</div>
											
											<div>
												<label className="block text-xs text-gray-400 mb-1">
													{t('Pipe Material')}
												</label>
												<select className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none">
													<option value="pvc">PVC</option>
													<option value="hdpe">HDPE</option>
													<option value="polyethylene">Polyethylene</option>
												</select>
											</div>
										</div>
									</div>

									{/* Pipe Summary */}
									<div className="bg-gray-700 rounded-lg p-4">
										<h3 className="text-sm font-semibold text-white mb-3">
											{t('Pipe Summary')}
										</h3>
										<div className="space-y-1 text-xs text-gray-400">
											<div className="flex justify-between">
												<span>{t('Main Pipes')}:</span>
												<span>-- {t('meters')}</span>
											</div>
											<div className="flex justify-between">
												<span>{t('Sub Main Pipes')}:</span>
												<span>-- {t('meters')}</span>
											</div>
											<div className="flex justify-between">
												<span>{t('Lateral Pipes')}:</span>
												<span>-- {t('meters')}</span>
											</div>
											<div className="flex justify-between border-t border-gray-600 pt-1 font-semibold text-white">
												<span>{t('Total Length')}:</span>
												<span>-- {t('meters')}</span>
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
