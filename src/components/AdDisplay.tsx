import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from './ui/card';
import { ExternalLink } from 'lucide-react';

interface AdDisplayProps {
  className?: string;
}

export function AdDisplay({ className = '' }: AdDisplayProps) {
  const { profileData } = useAuth();
  const [ad, setAd] = useState<any>(null);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const adsRef = collection(db, 'ads');
        const q = query(
          adsRef,
          where('status', '==', 'approved'),
          where('isActive', '==', true)
        );
        
        const snapshot = await getDocs(q);
        const now = new Date();
        
        let validAds = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((adData: any) => {
            // Check expiration
            if (adData.expiresAt && adData.expiresAt.toDate() < now) {
              return false;
            }

            // If no profile data, show non-targeted ads
            if (!profileData) {
              return !adData.targetAgeMin && !adData.targetAgeMax && !adData.targetCountry && !adData.targetCity && !adData.targetCategory;
            }

            // Check targeting
            if (adData.targetAgeMin && profileData.age && profileData.age < adData.targetAgeMin) return false;
            if (adData.targetAgeMax && profileData.age && profileData.age > adData.targetAgeMax) return false;
            
            if (adData.targetCountry && profileData.country) {
              if (adData.targetCountry.toLowerCase() !== profileData.country.toLowerCase()) return false;
            }
            
            if (adData.targetCity && profileData.city) {
              if (adData.targetCity.toLowerCase() !== profileData.city.toLowerCase()) return false;
            }
            
            if (adData.targetCategory && profileData.adCategoryPreference) {
              if (adData.targetCategory !== profileData.adCategoryPreference) return false;
            }

            return true;
          });

        if (validAds.length > 0) {
          // Pick a random ad
          const randomAd = validAds[Math.floor(Math.random() * validAds.length)];
          setAd(randomAd);
        }
      } catch (error) {
        console.error("Error fetching ads:", error);
      }
    };

    fetchAd();
  }, [profileData]);

  if (!ad) return null;

  return (
    <Card className={`overflow-hidden border-orange-200 bg-orange-50/50 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {ad.imageUrl && (
            <img src={ad.imageUrl} alt={ad.title} className="w-24 h-24 object-cover rounded-md" referrerPolicy="no-referrer" />
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-2 py-0.5 rounded">Sponsored</span>
            </div>
            <h4 className="font-bold text-slate-900 leading-tight mb-1">{ad.title}</h4>
            <p className="text-sm text-slate-600 mb-2 line-clamp-2">{ad.description}</p>
            {ad.linkUrl && (
              <a 
                href={ad.linkUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                Learn More <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
