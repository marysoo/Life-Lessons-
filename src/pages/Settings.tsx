import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { useNavigate } from 'react-router-dom';

export function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    email: '',
    phoneNumber: '',
    country: '',
    city: '',
    sex: '',
    age: '',
    hidePhoneNumber: false,
    hideCountry: false,
    hideAge: false,
  });

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users_private', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            displayName: data.displayName || '',
            bio: data.bio || '',
            email: data.email || '',
            phoneNumber: data.phoneNumber || '',
            country: data.country || '',
            city: data.city || '',
            sex: data.sex || '',
            age: data.age ? String(data.age) : '',
            hidePhoneNumber: data.hidePhoneNumber || false,
            hideCountry: data.hideCountry || false,
            hideAge: data.hideAge || false,
          });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const privateRef = doc(db, 'users_private', user.uid);
      const publicRef = doc(db, 'public_profiles', user.uid);

      const ageNum = formData.age ? parseInt(formData.age, 10) : null;
      
      // Check if profile is complete
      const isComplete = Boolean(
        formData.displayName && 
        formData.bio && 
        formData.city && 
        formData.country && 
        formData.sex && 
        ageNum !== null
      );

      // Update private data
      const privateData: any = {
        displayName: formData.displayName,
        bio: formData.bio,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        country: formData.country,
        city: formData.city,
        sex: formData.sex,
        hidePhoneNumber: formData.hidePhoneNumber,
        hideCountry: formData.hideCountry,
        hideAge: formData.hideAge,
        isProfileComplete: isComplete
      };
      if (ageNum !== null) privateData.age = ageNum;

      await updateDoc(privateRef, privateData);

      // Update public profile (respecting privacy toggles)
      const publicData: any = {
        displayName: formData.displayName,
        bio: formData.bio,
        city: formData.city,
        sex: formData.sex,
        isProfileComplete: isComplete
      };

      if (!formData.hidePhoneNumber && formData.phoneNumber) {
        publicData.phoneNumber = formData.phoneNumber;
      } else {
        publicData.phoneNumber = deleteField();
      }

      if (!formData.hideCountry && formData.country) {
        publicData.country = formData.country;
      } else {
        publicData.country = deleteField();
      }

      if (!formData.hideAge && ageNum !== null) {
        publicData.age = ageNum;
      } else {
        publicData.age = deleteField();
      }

      await updateDoc(publicRef, publicData);
      setSuccess('Profile updated successfully!');
      
      if (!isComplete) {
        setError('Please fill in Bio, City, Country, Sex, and Age to complete your profile.');
      }
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Profile Settings</h1>
      
      {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}
      {success && <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">Basic Information</h2>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Display Name *</label>
            <Input name="displayName" value={formData.displayName} onChange={handleChange} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bio *</label>
            <Textarea name="bio" value={formData.bio} onChange={handleChange} rows={3} placeholder="Tell us about yourself..." required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
              <Input name="city" value={formData.city} onChange={handleChange} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sex *</label>
              <select 
                name="sex" 
                value={formData.sex} 
                onChange={handleChange}
                required
                className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">Private Details & Visibility</h2>
          <p className="text-sm text-slate-500">Choose what information is visible on your public profile.</p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Private, never shared" />
          </div>

          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <Input name="phoneNumber" type="tel" value={formData.phoneNumber} onChange={handleChange} />
            </div>
            <div className="pt-7 flex items-center gap-2">
              <input type="checkbox" id="hidePhoneNumber" name="hidePhoneNumber" checked={formData.hidePhoneNumber} onChange={handleChange} className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500" />
              <label htmlFor="hidePhoneNumber" className="text-sm text-slate-600">Hide on profile</label>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Country / Nationality *</label>
              <Input name="country" value={formData.country} onChange={handleChange} required />
            </div>
            <div className="pt-7 flex items-center gap-2">
              <input type="checkbox" id="hideCountry" name="hideCountry" checked={formData.hideCountry} onChange={handleChange} className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500" />
              <label htmlFor="hideCountry" className="text-sm text-slate-600">Hide on profile</label>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Age *</label>
              <Input name="age" type="number" min="13" max="120" value={formData.age} onChange={handleChange} required />
            </div>
            <div className="pt-7 flex items-center gap-2">
              <input type="checkbox" id="hideAge" name="hideAge" checked={formData.hideAge} onChange={handleChange} className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500" />
              <label htmlFor="hideAge" className="text-sm text-slate-600">Hide on profile</label>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(`/profile/${user.uid}`)}>Cancel</Button>
          <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
