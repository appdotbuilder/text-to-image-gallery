import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { 
  Download, 
  Heart, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  Sparkles,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import type { ImageGeneration, GalleryImage, SaveToGalleryInput } from '../../../server/src/schema';

interface GeneratedImagesProps {
  images: ImageGeneration[];
  userId: number;
  onImageSavedToGallery: (galleryImage: GalleryImage) => void;
  onRefresh: () => void;
}

export function GeneratedImages({ images, userId, onImageSavedToGallery, onRefresh }: GeneratedImagesProps) {
  const [selectedImage, setSelectedImage] = useState<ImageGeneration | null>(null);
  const [saveTitle, setSaveTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveToGallery = async () => {
    if (!selectedImage) return;

    setIsSaving(true);
    setError(null);

    try {
      const saveInput: SaveToGalleryInput = {
        image_generation_id: selectedImage.id,
        user_id: userId,
        title: saveTitle.trim() || undefined,
        is_public: isPublic
      };

      const galleryImage = await trpc.saveToGallery.mutate(saveInput);
      onImageSavedToGallery(galleryImage);
      
      // Reset form and close dialog
      setSaveTitle('');
      setIsPublic(false);
      setSelectedImage(null);
      
    } catch (error) {
      console.error('Failed to save to gallery:', error);
      setError('Failed to save image to gallery. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async (image: ImageGeneration) => {
    setIsDownloading(true);
    setError(null);

    try {
      const response = await trpc.downloadImage.query({
        imageGenerationId: image.id,
        userId: userId
      });

      // Create a temporary link to download the image
      const link = document.createElement('a');
      link.href = response.downloadUrl;
      link.download = response.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Failed to download image:', error);
      setError('Failed to download image. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600 animate-pulse" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">No images generated yet</h3>
        <p className="text-gray-500 mb-6">
          Start creating amazing images with AI! Go to the Generate tab to get started. ✨
        </p>
        <Button 
          onClick={onRefresh}
          variant="outline"
          className="hover:bg-purple-50 hover:border-purple-200"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {images.length} image{images.length !== 1 ? 's' : ''} generated
        </p>
        <Button 
          onClick={onRefresh}
          variant="outline"
          size="sm"
          className="hover:bg-purple-50 hover:border-purple-200"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image: ImageGeneration) => (
          <Card key={image.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              {/* Image Display */}
              <div className="relative aspect-square bg-gray-100">
                {image.status === 'completed' && image.image_url ? (
                  <img
                    src={image.image_url}
                    alt={image.prompt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    {image.status === 'pending' && (
                      <div className="text-center space-y-2">
                        <Clock className="h-8 w-8 text-gray-400 mx-auto animate-pulse" />
                        <p className="text-sm text-gray-500">Generating...</p>
                      </div>
                    )}
                    {image.status === 'failed' && (
                      <div className="text-center space-y-2">
                        <XCircle className="h-8 w-8 text-red-400 mx-auto" />
                        <p className="text-sm text-red-500">Generation failed</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  <Badge className={`${getStatusColor(image.status)} border`}>
                    <span className="flex items-center space-x-1">
                      {getStatusIcon(image.status)}
                      <span className="capitalize text-xs">{image.status}</span>
                    </span>
                  </Badge>
                </div>
              </div>

              {/* Image Info */}
              <div className="p-4 space-y-3">
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
                    {image.prompt}
                  </p>
                  <div className="flex items-center text-xs text-gray-500 space-x-4">
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{image.created_at.toLocaleDateString()}</span>
                    </span>
                    {image.completed_at && (
                      <span className="flex items-center space-x-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{image.completed_at.toLocaleDateString()}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {image.status === 'completed' && (
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleDownload(image)}
                      disabled={isDownloading}
                      size="sm"
                      variant="outline"
                      className="flex-1 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => {
                            setSelectedImage(image);
                            setSaveTitle('');
                            setIsPublic(false);
                            setError(null);
                          }}
                          size="sm"
                          variant="outline"
                          className="flex-1 hover:bg-green-50 hover:border-green-200 hover:text-green-600"
                        >
                          <Heart className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center space-x-2">
                            <Heart className="h-5 w-5 text-red-500" />
                            <span>Save to Gallery</span>
                          </DialogTitle>
                        </DialogHeader>
                        
                        {selectedImage && (
                          <div className="space-y-4">
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                              <img
                                src={selectedImage.image_url}
                                alt={selectedImage.prompt}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <label htmlFor="save-title" className="block text-sm font-medium text-gray-700 mb-1">
                                  Title (optional)
                                </label>
                                <Input
                                  id="save-title"
                                  placeholder="Give your image a title..."
                                  value={saveTitle}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSaveTitle(e.target.value)}
                                  maxLength={100}
                                />
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="is-public"
                                  checked={isPublic}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsPublic(e.target.checked)}
                                  className="rounded border-gray-300"
                                />
                                <label htmlFor="is-public" className="text-sm text-gray-700">
                                  Make this image public
                                </label>
                              </div>
                              
                              <p className="text-xs text-gray-500">
                                <strong>Prompt:</strong> {selectedImage.prompt}
                              </p>
                            </div>

                            {error && (
                              <Alert variant="destructive" className="bg-red-50 border-red-200">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-sm">{error}</AlertDescription>
                              </Alert>
                            )}
                          </div>
                        )}
                        
                        <DialogFooter>
                          <Button
                            onClick={handleSaveToGallery}
                            disabled={isSaving}
                            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                          >
                            {isSaving ? (
                              <>
                                <Clock className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Heart className="h-4 w-4 mr-2" />
                                Save to Gallery
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}