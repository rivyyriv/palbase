import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  Share,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  Heart,
  Share2,
  MapPin,
  ExternalLink,
  Check,
  X,
} from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { formatAge, formatSize, formatLocation, formatAdoptionFee } from '@palbase/shared';
import type { Pet } from '@palbase/shared';

const { width } = Dimensions.get('window');

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [pet, setPet] = useState<Pet | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchPet = async () => {
      const { data } = await supabase
        .from('pets')
        .select('*')
        .eq('id', id)
        .single();

      setPet(data as Pet);

      if (user) {
        const { data: saved } = await supabase
          .from('saved_pets')
          .select('id')
          .eq('user_id', user.id)
          .eq('pet_id', id)
          .single();

        setIsSaved(!!saved);
      }

      setIsLoading(false);
    };

    fetchPet();
  }, [id, user]);

  const handleSave = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (isSaved) {
      await supabase
        .from('saved_pets')
        .delete()
        .eq('user_id', user.id)
        .eq('pet_id', id);
      setIsSaved(false);
    } else {
      await supabase
        .from('saved_pets')
        .insert({ user_id: user.id, pet_id: id });
      setIsSaved(true);
    }
  };

  const handleShare = async () => {
    if (!pet) return;

    try {
      await Share.share({
        message: `Check out ${pet.name}, an adorable ${pet.breed || pet.species} looking for a forever home on Palbase!`,
        url: pet.source_url,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleViewOriginal = () => {
    if (pet?.source_url) {
      Linking.openURL(pet.source_url);
    }
  };

  if (isLoading || !pet) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const photos = pet.photos?.length > 0 ? pet.photos : ['https://via.placeholder.com/400'];

  return (
    <ScrollView style={styles.container}>
      {/* Photo Gallery */}
      <View style={styles.imageContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentImageIndex(index);
          }}
        >
          {photos.map((photo, index) => (
            <Image
              key={index}
              source={{ uri: photo }}
              style={styles.image}
            />
          ))}
        </ScrollView>

        {/* Image Indicators */}
        {photos.length > 1 && (
          <View style={styles.indicators}>
            {photos.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentImageIndex && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, isSaved && styles.actionButtonActive]}
            onPress={handleSave}
          >
            <Heart
              size={24}
              color={isSaved ? '#fff' : '#dc3a26'}
              fill={isSaved ? '#fff' : 'none'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Share2 size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.speciesBadge}>
            <Text style={styles.speciesText}>{pet.species}</Text>
          </View>
          <Text style={styles.name}>{pet.name}</Text>
          <Text style={styles.breed}>
            {pet.breed || 'Unknown Breed'}
            {pet.breed_secondary && ` / ${pet.breed_secondary}`}
          </Text>
        </View>

        {/* Quick Info */}
        <View style={styles.quickInfo}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Age</Text>
            <Text style={styles.infoValue}>{formatAge(pet.age)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Size</Text>
            <Text style={styles.infoValue}>{formatSize(pet.size)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Gender</Text>
            <Text style={styles.infoValue}>{pet.gender}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Fee</Text>
            <Text style={styles.infoValue}>{formatAdoptionFee(pet.adoption_fee)}</Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.location}>
          <MapPin size={20} color="#6b7280" />
          <Text style={styles.locationText}>
            {formatLocation(pet.location_city, pet.location_state, pet.location_zip)}
          </Text>
        </View>

        {/* Attributes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About {pet.name}</Text>
          <View style={styles.attributes}>
            <AttributeBadge label="Good with kids" value={pet.good_with_kids} />
            <AttributeBadge label="Good with dogs" value={pet.good_with_dogs} />
            <AttributeBadge label="Good with cats" value={pet.good_with_cats} />
            <AttributeBadge label="House trained" value={pet.house_trained} />
            <AttributeBadge label="Spayed/Neutered" value={pet.spayed_neutered} />
            <AttributeBadge label="Special needs" value={pet.special_needs} />
          </View>
        </View>

        {/* Description */}
        {pet.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{pet.description}</Text>
          </View>
        )}

        {/* Shelter Info */}
        <View style={styles.shelterSection}>
          <Text style={styles.sectionTitle}>Shelter Information</Text>
          {pet.shelter_name && (
            <Text style={styles.shelterName}>{pet.shelter_name}</Text>
          )}
          {pet.shelter_phone && (
            <Text style={styles.shelterContact}>Phone: {pet.shelter_phone}</Text>
          )}
          {pet.shelter_email && (
            <Text style={styles.shelterContact}>Email: {pet.shelter_email}</Text>
          )}

          <TouchableOpacity
            style={styles.viewOriginalButton}
            onPress={handleViewOriginal}
          >
            <Text style={styles.viewOriginalText}>View Original Listing</Text>
            <ExternalLink size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function AttributeBadge({ label, value }: { label: string; value: boolean | null }) {
  return (
    <View
      style={[
        styles.attributeBadge,
        value === true && styles.attributeBadgePositive,
        value === false && styles.attributeBadgeNegative,
      ]}
    >
      {value === true && <Check size={14} color="#15803d" />}
      {value === false && <X size={14} color="#b91c1c" />}
      {value === null && <Text style={styles.attributeUnknown}>?</Text>}
      <Text
        style={[
          styles.attributeText,
          value === true && styles.attributeTextPositive,
          value === false && styles.attributeTextNegative,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 16,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: width,
    height: width,
    backgroundColor: '#e5e7eb',
  },
  indicators: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  indicatorActive: {
    backgroundColor: '#fff',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonActive: {
    backgroundColor: '#dc3a26',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  speciesBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3f2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  speciesText: {
    color: '#dc3a26',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  breed: {
    fontSize: 18,
    color: '#6b7280',
    marginTop: 4,
  },
  quickInfo: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  locationText: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  attributes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attributeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  attributeBadgePositive: {
    backgroundColor: '#f0fdf4',
  },
  attributeBadgeNegative: {
    backgroundColor: '#fef2f2',
  },
  attributeText: {
    fontSize: 14,
    color: '#6b7280',
  },
  attributeTextPositive: {
    color: '#15803d',
  },
  attributeTextNegative: {
    color: '#b91c1c',
  },
  attributeUnknown: {
    fontSize: 14,
    color: '#9ca3af',
  },
  description: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
  shelterSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  shelterName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  shelterContact: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  viewOriginalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc3a26',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  viewOriginalText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
