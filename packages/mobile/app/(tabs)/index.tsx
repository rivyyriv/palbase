import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Link } from 'expo-router';
import { Heart, ArrowRight } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import type { Pet } from '@palbase/shared';

export default function HomeScreen() {
  const [featuredPets, setFeaturedPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPets = async () => {
    const { data } = await supabase
      .from('pets')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);

    setFeaturedPets((data as Pet[]) || []);
    setIsLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchPets();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPets();
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Heart size={32} color="#fff" fill="#fff" />
        </View>
        <Text style={styles.heroTitle}>Find Your Perfect Pet</Text>
        <Text style={styles.heroSubtitle}>
          Discover adoptable pets from shelters across the US
        </Text>
        <Link href="/search" asChild>
          <TouchableOpacity style={styles.heroButton}>
            <Text style={styles.heroButtonText}>Start Searching</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Featured Pets */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recently Added</Text>
          <Link href="/search" asChild>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <ArrowRight size={16} color="#dc3a26" />
            </TouchableOpacity>
          </Link>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading pets...</Text>
          </View>
        ) : featuredPets.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.petsScroll}
          >
            {featuredPets.map((pet) => (
              <Link key={pet.id} href={`/pet/${pet.id}`} asChild>
                <TouchableOpacity style={styles.petCard}>
                  <Image
                    source={{ uri: pet.photos?.[0] || 'https://via.placeholder.com/200' }}
                    style={styles.petImage}
                  />
                  <View style={styles.petInfo}>
                    <Text style={styles.petName}>{pet.name}</Text>
                    <Text style={styles.petBreed}>{pet.breed || 'Unknown Breed'}</Text>
                    <Text style={styles.petLocation}>
                      {pet.location_city}, {pet.location_state}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Link>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pets available yet</Text>
          </View>
        )}
      </View>

      {/* Quick Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Browse by Type</Text>
        <View style={styles.quickLinks}>
          <Link href="/search?species=dog" asChild>
            <TouchableOpacity style={styles.quickLink}>
              <Text style={styles.quickLinkEmoji}>🐕</Text>
              <Text style={styles.quickLinkText}>Dogs</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/search?species=cat" asChild>
            <TouchableOpacity style={styles.quickLink}>
              <Text style={styles.quickLinkEmoji}>🐈</Text>
              <Text style={styles.quickLinkText}>Cats</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/search?species=rabbit" asChild>
            <TouchableOpacity style={styles.quickLink}>
              <Text style={styles.quickLinkEmoji}>🐰</Text>
              <Text style={styles.quickLinkText}>Rabbits</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/search?species=bird" asChild>
            <TouchableOpacity style={styles.quickLink}>
              <Text style={styles.quickLinkEmoji}>🐦</Text>
              <Text style={styles.quickLinkText}>Birds</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  hero: {
    backgroundColor: '#dc3a26',
    padding: 24,
    alignItems: 'center',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 8,
  },
  heroButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  heroButtonText: {
    color: '#dc3a26',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    color: '#dc3a26',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyText: {
    color: '#6b7280',
  },
  petsScroll: {
    paddingRight: 16,
  },
  petCard: {
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  petImage: {
    width: '100%',
    height: 150,
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
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  quickLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickLink: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickLinkEmoji: {
    fontSize: 32,
  },
  quickLinkText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});
