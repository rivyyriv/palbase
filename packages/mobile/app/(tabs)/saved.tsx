import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Heart, MapPin } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import type { Pet } from '@palbase/shared';

export default function SavedScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const [savedPets, setSavedPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSavedPets = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from('saved_pets')
      .select(`
        id,
        pet:pets (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const pets = data?.map((item: any) => item.pet).filter(Boolean) || [];
    setSavedPets(pets as Pet[]);
    setIsLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchSavedPets();
    }
  }, [authLoading, fetchSavedPets]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSavedPets();
  };

  if (authLoading || isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Heart size={64} color="#d1d5db" />
        <Text style={styles.emptyTitle}>Sign in to save pets</Text>
        <Text style={styles.emptySubtitle}>
          Create an account to save your favorite pets
        </Text>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderPetCard = ({ item }: { item: Pet }) => (
    <Link href={`/pet/${item.id}`} asChild>
      <TouchableOpacity style={styles.petCard}>
        <Image
          source={{ uri: item.photos?.[0] || 'https://via.placeholder.com/150' }}
          style={styles.petImage}
        />
        <View style={styles.petInfo}>
          <Text style={styles.petName}>{item.name}</Text>
          <Text style={styles.petBreed}>{item.breed || 'Unknown Breed'}</Text>
          <View style={styles.petLocation}>
            <MapPin size={12} color="#9ca3af" />
            <Text style={styles.petLocationText}>
              {item.location_city}, {item.location_state}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={savedPets}
        keyExtractor={(item) => item.id}
        renderItem={renderPetCard}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Heart size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No saved pets yet</Text>
            <Text style={styles.emptySubtitle}>
              Browse pets and tap the heart to save them here
            </Text>
            <Link href="/search" asChild>
              <TouchableOpacity style={styles.browseButton}>
                <Text style={styles.browseButtonText}>Browse Pets</Text>
              </TouchableOpacity>
            </Link>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  signInButton: {
    backgroundColor: '#dc3a26',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  browseButton: {
    backgroundColor: '#dc3a26',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 8,
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  petCard: {
    flex: 0.48,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  petImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#e5e7eb',
  },
  petInfo: {
    padding: 12,
  },
  petName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  petBreed: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  petLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  petLocationText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
