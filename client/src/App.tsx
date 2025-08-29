import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { AuthForm } from '@/components/AuthForm';
import { ImageGenerator } from '@/components/ImageGenerator';
import { UserGallery } from '@/components/UserGallery';
import { GeneratedImages } from '@/components/GeneratedImages';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Sparkles, Image, Images } from 'lucide-react';
// Using type-only imports for better TypeScript compliance
import type { AuthResponse, ImageGeneration, GalleryImage } from '../../server/src/schema';

interface User {
  id: number;
  email: string;
  username: string;
  created_at: Date;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  const [imageGenerations, setImageGenerations] = useState<ImageGeneration[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);

  // Load user data from localStorage on app start
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  // Load user's generated images
  const loadImageGenerations = useCallback(async () => {
    if (!user) return;
    
    try {
      const result = await trpc.getUserImageGenerations.query({
        user_id: user.id,
        limit: 20,
        offset: 0
      });
      setImageGenerations(result);
    } catch (error) {
      console.error('Failed to load image generations:', error);
    }
  }, [user]);

  // Load user's gallery
  const loadGallery = useCallback(async () => {
    if (!user) return;
    
    try {
      const result = await trpc.getUserGallery.query({
        user_id: user.id,
        limit: 20,
        offset: 0
      });
      setGalleryImages(result);
    } catch (error) {
      console.error('Failed to load gallery:', error);
    }
  }, [user]);

  // Load data when user logs in or tab changes
  useEffect(() => {
    if (user) {
      if (activeTab === 'generated') {
        loadImageGenerations();
      } else if (activeTab === 'gallery') {
        loadGallery();
      }
    }
  }, [user, activeTab, loadImageGenerations, loadGallery]);

  const handleAuth = async (authResponse: AuthResponse) => {
    setUser(authResponse.user);
    setToken(authResponse.token);
    
    // Store in localStorage
    localStorage.setItem('user', JSON.stringify(authResponse.user));
    localStorage.setItem('token', authResponse.token);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setImageGenerations([]);
    setGalleryImages([]);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const handleImageGenerated = (newImage: ImageGeneration) => {
    setImageGenerations((prev: ImageGeneration[]) => [newImage, ...prev]);
  };

  const handleImageSavedToGallery = (newGalleryImage: GalleryImage) => {
    setGalleryImages((prev: GalleryImage[]) => [newGalleryImage, ...prev]);
  };

  const handleImageDeleted = (deletedImageId: number) => {
    setGalleryImages((prev: GalleryImage[]) => prev.filter(img => img.id !== deletedImageId));
  };

  // Not authenticated - show login/register
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              ✨ AI Image Studio
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Transform your imagination into stunning visuals
            </p>
          </CardHeader>
          <CardContent>
            <AuthForm 
              onAuth={handleAuth}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated - show main application
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  AI Image Studio
                </h1>
                <p className="text-sm text-gray-600">Welcome back, {user.username}! ✨</p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="generate" className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4" />
              <span>Generate</span>
            </TabsTrigger>
            <TabsTrigger value="generated" className="flex items-center space-x-2">
              <Image className="h-4 w-4" />
              <span>My Images</span>
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center space-x-2">
              <Images className="h-4 w-4" />
              <span>Gallery</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <span>Create Amazing Images with AI</span>
                </CardTitle>
                <p className="text-gray-600">
                  Describe what you want to see, and watch AI bring it to life! 🎨
                </p>
              </CardHeader>
              <CardContent>
                <ImageGenerator 
                  userId={user.id}
                  onImageGenerated={handleImageGenerated}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generated" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Image className="h-5 w-5 text-blue-600" />
                  <span>Your Generated Images</span>
                </CardTitle>
                <p className="text-gray-600">
                  All your AI-generated masterpieces in one place 🖼️
                </p>
              </CardHeader>
              <CardContent>
                <GeneratedImages 
                  images={imageGenerations}
                  userId={user.id}
                  onImageSavedToGallery={handleImageSavedToGallery}
                  onRefresh={loadImageGenerations}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gallery" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Images className="h-5 w-5 text-green-600" />
                  <span>Personal Gallery</span>
                </CardTitle>
                <p className="text-gray-600">
                  Your curated collection of saved images 🎭
                </p>
              </CardHeader>
              <CardContent>
                <UserGallery 
                  images={galleryImages}
                  userId={user.id}
                  onImageDeleted={handleImageDeleted}
                  onRefresh={loadGallery}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;