import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { 
  Edit, 
  Trash2, 
  Share, 
  Globe, 
  Lock, 
  Copy,
  Calendar,
  Sparkles,
  AlertCircle,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import type { GalleryImage, UpdateGalleryImageInput } from '../../../server/src/schema';

interface UserGalleryProps {
  images: GalleryImage[];
  userId: number;
  onImageDeleted: (imageId: number) => void;
  onRefresh: () => void;
}

export function UserGallery({ images, userId, onImageDeleted, onRefresh }: UserGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleEditImage = async () => {
    if (!selectedImage) return;

    setIsEditing(true);
    setError(null);

    try {
      const updateInput: UpdateGalleryImageInput = {
        id: selectedImage.id,
        user_id: userId,
        title: editTitle.trim() || undefined,
        is_public: editIsPublic
      };

      await trpc.updateGalleryImage.mutate(updateInput);
      
      // Update the local state
      setSelectedImage({
        ...selectedImage,
        title: editTitle.trim() || null,
        is_public: editIsPublic
      });
      
      setSuccess('Image updated successfully! 🎉');
      onRefresh(); // Refresh the gallery to get latest data
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Failed to update image:', error);
      setError('Failed to update image. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    setIsDeleting(true);
    setError(null);

    try {
      await trpc.deleteGalleryImage.mutate({
        id: imageId,
        user_id: userId
      });

      onImageDeleted(imageId);
      setSuccess('Image deleted successfully! 🗑️');
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Failed to delete image:', error);
      setError('Failed to delete image. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShareImage = async (image: GalleryImage) => {
    setIsSharing(true);
    setError(null);

    try {
      const response = await trpc.shareImage.mutate({
        gallery_image_id: image.id,
        user_id: userId
      });

      setShareUrl(response.shareUrl);
      
    } catch (error) {
      console.error('Failed to generate share URL:', error);
      setError('Failed to generate share URL. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Share URL copied to clipboard! 📋');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setError('Failed to copy to clipboard. Please copy manually.');
    }
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">Your gallery is empty</h3>
        <p className="text-gray-500 mb-6">
          Save your favorite generated images to build your personal gallery! 🎨
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

      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {images.length} image{images.length !== 1 ? 's' : ''} in your gallery
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
        {images.map((image: GalleryImage) => (
          <Card key={image.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              {/* Image Display - Note: This is placeholder since we need to join with ImageGeneration data */}
              <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200">
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Sparkles className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-500">Gallery Image #{image.id}</p>
                  </div>
                </div>
                
                {/* Visibility Badge */}
                <div className="absolute top-2 right-2">
                  <Badge className={image.is_public ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-gray-100 text-gray-800 border-gray-200'}>
                    <span className="flex items-center space-x-1">
                      {image.is_public ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      <span className="text-xs">{image.is_public ? 'Public' : 'Private'}</span>
                    </span>
                  </Badge>
                </div>
              </div>

              {/* Image Info */}
              <div className="p-4 space-y-3">
                <div className="space-y-2">
                  {image.title && (
                    <h3 className="font-semibold text-gray-800 line-clamp-2">
                      {image.title}
                    </h3>
                  )}
                  
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>Added {image.created_at.toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  {/* Edit Button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => {
                          setSelectedImage(image);
                          setEditTitle(image.title || '');
                          setEditIsPublic(image.is_public);
                          setError(null);
                        }}
                        size="sm"
                        variant="outline"
                        className="flex-1 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                          <Edit className="h-5 w-5 text-blue-600" />
                          <span>Edit Gallery Image</span>
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
                            Title
                          </label>
                          <Input
                            id="edit-title"
                            placeholder="Give your image a title..."
                            value={editTitle}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
                            maxLength={100}
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="edit-is-public"
                            checked={editIsPublic}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditIsPublic(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor="edit-is-public" className="text-sm text-gray-700">
                            Make this image public
                          </label>
                        </div>

                        {error && (
                          <Alert variant="destructive" className="bg-red-50 border-red-200">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-sm">{error}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                      
                      <DialogFooter>
                        <Button
                          onClick={handleEditImage}
                          disabled={isEditing}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                          {isEditing ? 'Updating...' : 'Update Image'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Share Button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => handleShareImage(image)}
                        size="sm"
                        variant="outline"
                        className="flex-1 hover:bg-green-50 hover:border-green-200 hover:text-green-600"
                      >
                        <Share className="h-3 w-3 mr-1" />
                        Share
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                          <Share className="h-5 w-5 text-green-600" />
                          <span>Share Image</span>
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        {isSharing ? (
                          <div className="text-center py-4">
                            <RefreshCw className="h-8 w-8 text-gray-400 mx-auto animate-spin mb-2" />
                            <p className="text-sm text-gray-500">Generating share link...</p>
                          </div>
                        ) : shareUrl ? (
                          <div className="space-y-3">
                            <p className="text-sm text-gray-700">Share this link with others:</p>
                            <div className="flex space-x-2">
                              <Input
                                value={shareUrl}
                                readOnly
                                className="font-mono text-sm"
                              />
                              <Button
                                onClick={() => copyToClipboard(shareUrl)}
                                size="sm"
                                variant="outline"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500">
                              Anyone with this link can view your image.
                            </p>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <Share className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Click share to generate a link</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Delete Button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center space-x-2">
                          <Trash2 className="h-5 w-5 text-red-600" />
                          <span>Delete Image</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this image from your gallery? This action cannot be undone.
                          {image.title && (
                            <span className="block mt-2 font-medium">"{image.title}"</span>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteImage(image.id)}
                          disabled={isDeleting}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}