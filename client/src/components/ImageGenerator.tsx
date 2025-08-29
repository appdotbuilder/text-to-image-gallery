import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';
import { Sparkles, Wand2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ImageGeneration, GenerateImageInput } from '../../../server/src/schema';

interface ImageGeneratorProps {
  userId: number;
  onImageGenerated: (image: ImageGeneration) => void;
}

export function ImageGenerator({ userId, onImageGenerated }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    setProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 20;
        });
      }, 500);

      const generateInput: GenerateImageInput = {
        prompt: prompt.trim(),
        user_id: userId
      };

      const response = await trpc.generateImage.mutate(generateInput);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      onImageGenerated(response);
      setSuccess('Image generated successfully! 🎉');
      setPrompt(''); // Clear the prompt after successful generation
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Image generation failed:', error);
      setError('Failed to generate image. Please try again.');
      setProgress(0);
    } finally {
      setIsGenerating(false);
      // Reset progress after a delay
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const suggestedPrompts = [
    "A majestic dragon soaring over a mystical forest at sunset",
    "A futuristic city with flying cars and neon lights",
    "A cozy cabin in the mountains during winter",
    "An underwater coral reef with colorful tropical fish",
    "A steampunk mechanical owl with brass gears",
    "A magical fairy garden with glowing mushrooms"
  ];

  return (
    <div className="space-y-6">
      {/* Status Messages */}
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

      {/* Progress Bar */}
      {isGenerating && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Generating your image...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleGenerate} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="prompt" className="text-base font-semibold text-gray-800">
            🎨 Describe your vision
          </Label>
          <Textarea
            id="prompt"
            placeholder="Describe the image you want to create in detail... The more specific you are, the better the result!"
            value={prompt}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
            className="min-h-[120px] resize-none text-base"
            disabled={isGenerating}
            maxLength={1000}
          />
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Be creative and specific for best results! ✨</span>
            <span>{prompt.length}/1000</span>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isGenerating || !prompt.trim()}
          size="lg"
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 text-base"
        >
          {isGenerating ? (
            <>
              <Wand2 className="h-5 w-5 mr-2 animate-spin" />
              Creating Magic...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Generate Image
            </>
          )}
        </Button>
      </form>

      {/* Suggested Prompts */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">💡 Need inspiration? Try these:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {suggestedPrompts.map((suggestedPrompt: string, index: number) => (
            <button
              key={index}
              type="button"
              onClick={() => setPrompt(suggestedPrompt)}
              disabled={isGenerating}
              className="text-left p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors text-sm text-gray-700 hover:text-purple-700 disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:bg-transparent disabled:hover:text-gray-700"
            >
              {suggestedPrompt}
            </button>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <h4 className="font-semibold text-blue-800 flex items-center">
          <Sparkles className="h-4 w-4 mr-2" />
          Tips for better results:
        </h4>
        <ul className="text-sm text-blue-700 space-y-1 ml-6">
          <li>• Be specific about colors, lighting, and mood</li>
          <li>• Include art style references (e.g., "photorealistic", "cartoon", "oil painting")</li>
          <li>• Mention composition details (e.g., "close-up", "wide shot", "bird's eye view")</li>
          <li>• Add atmosphere descriptions (e.g., "mysterious", "bright and cheerful", "dramatic")</li>
        </ul>
      </div>
    </div>
  );
}