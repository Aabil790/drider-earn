import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play } from 'lucide-react';
import { toast } from 'sonner';

const Training = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    if (!user?.is_paid) {
      toast.error('Membership required');
      navigate('/dashboard');
      return;
    }
    fetchCategories();
  }, [user]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/videos/categories');
      setCategories(response.data);
      if (response.data.length > 0) {
        setSelectedCategory(response.data[0].id);
        fetchVideos(response.data[0].id);
      }
    } catch (error) {
      toast.error('Failed to load categories');
    }
  };

  const fetchVideos = async (categoryId) => {
    try {
      const response = await api.get(`/videos/category/${categoryId}`);
      setVideos(response.data);
    } catch (error) {
      toast.error('Failed to load videos');
    }
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    fetchVideos(categoryId);
  };

  const getYouTubeEmbedUrl = (url) => {
    const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
    return `https://www.youtube.com/embed/${videoId}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8" data-testid="training-page">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Training Videos</h1>
          <p className="text-gray-600">Learn proven earning strategies</p>
        </div>

        {categories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No training videos available yet. Check back soon!</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={selectedCategory} onValueChange={handleCategoryChange}>
            <TabsList className="mb-6">
              {categories.map((category) => (
                <TabsTrigger key={category.id} value={category.id} data-testid={`category-tab-${category.id}`}>
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((category) => (
              <TabsContent key={category.id} value={category.id}>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.map((video) => (
                    <Card key={video.id} className="hover:shadow-md transition-shadow" data-testid={`video-card-${video.id}`}>
                      <CardHeader className="p-0">
                        <div className="relative aspect-video bg-gray-200 rounded-t-xl overflow-hidden">
                          <iframe
                            src={getYouTubeEmbedUrl(video.youtube_url)}
                            className="w-full h-full"
                            allowFullScreen
                            title={video.title}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <CardTitle className="text-lg mb-2">{video.title}</CardTitle>
                        <CardDescription>{video.description}</CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {videos.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-600">No videos in this category yet.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Training;
