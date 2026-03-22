'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import Cropper from 'react-easy-crop';
// 👇 استدعاء محرك اللغة 👇
import { useLang } from '@/context/LanguageContext';

// ==========================================
// ✂️ دوال مساعدة لقص الصورة (Image Cropping)
// ==========================================
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<File | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(
    image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) { resolve(null); return; }
      resolve(new File([blob], `cropped-${Date.now()}.jpeg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  });
}

export default function ProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, lang } = useLang(); // 👈 تفعيل الترجمة

  // --- States ---
  const [profile, setProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [userCerts, setUserCerts] = useState<any[]>([]);
  const [userEducation, setUserEducation] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'liked' | 'projects' | 'certs'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // --- Modals States ---
  const [showModal, setShowModal] = useState<'edit' | 'delete' | 'followers' | 'following' | 'addProject' | 'addCert' | 'addEdu' | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);

  // --- Cropping States ---
  const [previewUpload, setPreviewUpload] = useState<{ type: 'avatar' | 'cover', url: string } | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  // --- Form States ---
  const [editData, setEditData] = useState({ full_name: '', rank: '', bio: '' });
  const [projectData, setProjectData] = useState({ title: '', description: '', repo_url: '', live_url: '' });
  const [certData, setCertData] = useState({ title: '', issuer: '', issue_date: '', credential_url: '' });
  const [eduData, setEduData] = useState({ university: '', degree: '', start_year: '', end_year: '' });
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);

  // ==========================================
  // 🛰️ Fetch Logic
  // ==========================================
  const fetchProfileData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user ?? null);

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', id).single();
      setProfile(profileData);
      setEditData({ full_name: profileData?.full_name || '', rank: profileData?.rank || '', bio: profileData?.bio || '' });

      const { data: postsData } = await supabase.from('snippets').select('*').eq('user_id', id).order('created_at', { ascending: false });
      const { data: allLikes } = await supabase.from('likes').select('*');
      const { data: allComments } = await supabase.from('comments').select('post_id');

      setUserPosts((postsData || []).map(post => ({
        ...post,
        likes_count: allLikes?.filter(l => l.post_id === post.id).length || 0,
        comments_count: allComments?.filter(c => c.post_id === post.id).length || 0,
        isLikedByMe: allLikes?.some(l => l.post_id === post.id && l.user_id === session?.user?.id)
      })));

      const { data: myLikes } = await supabase.from('likes').select('post_id').eq('user_id', id);
      if (myLikes?.length) {
        const { data: likedSnippets } = await supabase.from('snippets').select('*').in('id', myLikes.map(l => l.post_id));
        setLikedPosts((likedSnippets || []).map(post => ({
          ...post,
          likes_count: allLikes?.filter(l => l.post_id === post.id).length || 0,
          comments_count: allComments?.filter(c => c.post_id === post.id).length || 0,
          isLikedByMe: true
        })));
      } else {
        setLikedPosts([]);
      }

      const { data: projects } = await supabase.from('projects').select('*').eq('user_id', id).order('created_at', { ascending: false });
      setUserProjects(projects || []);
      const { data: certs } = await supabase.from('certificates').select('*').eq('user_id', id).order('created_at', { ascending: false });
      setUserCerts(certs || []);
      const { data: edu } = await supabase.from('educations').select('*').eq('user_id', id).order('created_at', { ascending: false });
      setUserEducation(edu || []);

      const { data: followers } = await supabase.from('follows').select('*').eq('following_id', id);
      const { data: following } = await supabase.from('follows').select('*').eq('follower_id', id);
      setStats({ followers: followers?.length || 0, following: following?.length || 0 });
      setIsFollowing(!!followers?.some(f => f.follower_id === session?.user.id));

      if (followers?.length) {
        const { data: f } = await supabase.from('profiles').select('*').in('id', followers.map(f => f.follower_id));
        setFollowersList(f || []);
      }
      if (following?.length) {
        const { data: f } = await supabase.from('profiles').select('*').in('id', following.map(f => f.following_id));
        setFollowingList(f || []);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchProfileData(); }, [fetchProfileData]);

  // ==========================================
  // ☁️ Upload Helpers
  // ==========================================
  const uploadFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${folder}/${currentUser.id}-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('post-images').upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(filePath);
    return publicUrl;
  };

  const isVideo = (url: string) => url?.match(/\.(mp4|webm|ogg)$/i) || url?.includes('video');

  // ==========================================
  // ✂️ Image Cropping Handlers
  // ==========================================
  const onSelectAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setPreviewUpload({ type: 'avatar', url: URL.createObjectURL(file) }); setCrop({ x: 0, y: 0 }); setZoom(1); }
    e.target.value = '';
  };

  const onSelectCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setPreviewUpload({ type: 'cover', url: URL.createObjectURL(file) }); setCrop({ x: 0, y: 0 }); setZoom(1); }
    e.target.value = '';
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const confirmImageUpload = async () => {
    if (!previewUpload || !currentUser || !croppedAreaPixels) return;
    setUploadingMedia(true);
    try {
      const croppedFile = await getCroppedImg(previewUpload.url, croppedAreaPixels);
      if (!croppedFile) throw new Error("Crop failed");
      const url = await uploadFile(croppedFile, previewUpload.type === 'avatar' ? 'avatars' : 'covers');
      const updateKey = previewUpload.type === 'avatar' ? 'avatar_url' : 'cover_url';
      
      const { error } = await supabase.from('profiles').update({ [updateKey]: `${url}?v=${Date.now()}` }).eq('id', id);
      if (error) throw error;

      setPreviewUpload(null); 
      window.location.reload();
    } catch (err: any) { 
      toast.error(err.message || "Upload Failed"); 
    } finally { 
      setUploadingMedia(false); 
    }
  };

  // ==========================================
  // 📝 Business Logic Handlers
  // ==========================================
  
  const handleToggleLike = async (postId: string, isCurrentlyLiked: boolean) => {
    if (!currentUser) return toast.error(t('login_required'));
    try {
      if (isCurrentlyLiked) {
        await supabase.from('likes').delete().match({ user_id: currentUser.id, post_id: postId });
        setUserPosts(prev => prev.map(p => p.id === postId ? { ...p, isLikedByMe: false, likes_count: p.likes_count - 1 } : p));
        setLikedPosts(prev => prev.filter(p => p.id !== postId)); 
      } else {
        await supabase.from('likes').insert({ user_id: currentUser.id, post_id: postId });
        setUserPosts(prev => prev.map(p => p.id === postId ? { ...p, isLikedByMe: true, likes_count: p.likes_count + 1 } : p));
        fetchProfileData(); 
      }
    } catch { toast.error("Failed"); }
  };

  const handleFollow = async () => {
    if (!currentUser) return toast.error(t('login_required'));
    if (currentUser.id === id) return;
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().match({ follower_id: currentUser.id, following_id: id });
        setIsFollowing(false);
        setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
      } else {
        await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: id });
        await supabase.from('notifications').insert({ user_id: id, sender_id: currentUser.id, type: 'follow' });
        setIsFollowing(true);
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch { toast.error("Action Failed"); }
  };

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || currentUser.id !== id) return;
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) return toast.error("Please upload PDF or Word");
    setUploadingMedia(true);
    try {
      const url = await uploadFile(file, 'cvs');
      const { error } = await supabase.from('profiles').update({ cv_url: url }).eq('id', id);
      if (error) throw error;
      setProfile((p: any) => ({ ...p, cv_url: url }));
      toast.success("CV Updated");
    } catch (err: any) { 
      toast.error(err.message || "Failed"); 
    } finally { 
      setUploadingMedia(false); 
    }
  };

  const handleAddProject = async () => {
    if (!projectData.title) return toast.error("Title is required");
    setUploadingMedia(true);
    try {
      let media_url = null;
      if (projectFile) {
        media_url = await uploadFile(projectFile, 'projects');
      }
      
      const { error } = await supabase.from('projects').insert({ 
        user_id: currentUser.id, 
        title: projectData.title,
        description: projectData.description,
        repo_url: projectData.repo_url,
        live_url: projectData.live_url,
        media_url: media_url 
      });
      
      if (error) throw error;
      
      toast.success("Project Added Successfully");
      setShowModal(null); 
      setProjectData({ title: '', description: '', repo_url: '', live_url: '' }); 
      setProjectFile(null); 
      fetchProfileData();
    } catch (err: any) { 
      toast.error(err.message || "Failed to add project"); 
    } finally { 
      setUploadingMedia(false); 
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
      setUserProjects(prev => prev.filter(p => p.id !== projectId));
      toast.success("Project Removed");
    } catch (err: any) { 
      toast.error(err.message || "Failed to delete project"); 
    }
  };

  const handleAddCert = async () => {
    if (!certData.title || !certData.issuer) return toast.error("Title & Issuer are required");
    setUploadingMedia(true);
    try {
      let image_url = null;
      if (certFile) image_url = await uploadFile(certFile, 'certificates');
      
      const { error } = await supabase.from('certificates').insert({ 
        user_id: currentUser.id, 
        title: certData.title,
        issuer: certData.issuer,
        issue_date: certData.issue_date || null,
        credential_url: certData.credential_url,
        image_url: image_url 
      });
      
      if (error) throw error;
      
      toast.success("Certificate Added");
      setShowModal(null); 
      setCertData({ title: '', issuer: '', issue_date: '', credential_url: '' }); 
      setCertFile(null); 
      fetchProfileData();
    } catch (err: any) { 
      toast.error(err.message || "Failed to add certificate"); 
    } finally { 
      setUploadingMedia(false); 
    }
  };

  const handleDeleteCert = async (certId: string) => {
    try {
      const { error } = await supabase.from('certificates').delete().eq('id', certId);
      if (error) throw error;
      setUserCerts(prev => prev.filter(c => c.id !== certId));
      toast.success("Certificate Removed");
    } catch (err: any) { 
      toast.error(err.message || "Failed to delete certificate"); 
    }
  };

  const handleAddEdu = async () => {
    if (!eduData.university) return toast.error("University is required");
    try {
      const { error } = await supabase.from('educations').insert({ user_id: currentUser.id, ...eduData });
      if (error) throw error;
      
      toast.success("Education Added Successfully!");
      setShowModal(null); 
      setEduData({ university: '', degree: '', start_year: '', end_year: '' }); 
      fetchProfileData();
    } catch { 
      toast.error("Failed to add education"); 
    }
  };

  const handleDeleteEdu = async (eduId: string) => {
    try {
      const { error } = await supabase.from('educations').delete().eq('id', eduId);
      if (error) throw error;
      setUserEducation(prev => prev.filter(e => e.id !== eduId));
      toast.success("Education Removed");
    } catch { toast.error("Failed"); }
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;
    try {
      const { error } = await supabase.from('snippets').delete().eq('id', postToDelete);
      if (error) throw error;
      setUserPosts(prev => prev.filter(p => p.id !== postToDelete));
      setShowModal(null);
      toast.success("Deleted successfully");
    } catch (err: any) { toast.error(err.message || "Failed"); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black text-cyan-500 animate-pulse uppercase tracking-widest">{t('syncing_node')}</div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-20">
      
      {/* Input الرفع المخفي */}
      <input type="file" hidden accept="image/*" ref={avatarInputRef} onChange={onSelectAvatar} />

      <div className="w-full px-4 md:px-8 lg:px-12 pt-6 max-w-7xl mx-auto">
        <Link href="/" className="text-sm font-black uppercase text-cyan-500 hover:text-cyan-400 mb-6 inline-block tracking-widest transition-all">
          <span className="rtl:hidden">{t('back_to_mainframe')}</span>
          <span className="ltr:hidden">العودة_للمين_فريم →</span>
        </Link>

        {/* --- Header Card --- */}
        <div className="bg-[#0f172a] border border-white/5 rounded-[2rem] overflow-visible mb-10 shadow-xl relative">
            
            {/* ⚙️ Menu */}
            {currentUser?.id === id && (
              <div className="absolute top-4 rtl:left-4 ltr:right-4 z-30">
                <button onClick={() => setShowDropdown(!showDropdown)} className="w-12 h-12 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center transition-all border border-white/10">
                  <span className="text-white font-bold text-2xl leading-none pb-2">...</span>
                </button>
                {showDropdown && (
                  <div className="absolute rtl:left-0 ltr:right-0 mt-2 w-64 bg-[#0f172a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden py-2 z-50">
                    <button onClick={() => { setShowDropdown(false); setShowModal('edit'); }} className="w-full rtl:text-right ltr:text-left px-5 py-4 text-base font-black text-white hover:bg-white/5 transition-all">{t('edit_profile_menu')}</button>
                    <button onClick={() => { setShowDropdown(false); avatarInputRef.current?.click(); }} className="w-full rtl:text-right ltr:text-left px-5 py-4 text-base font-black text-white hover:bg-white/5 transition-all border-t border-white/5">{t('change_picture_menu')}</button>
                    <button onClick={() => { setShowDropdown(false); setShowModal('addEdu'); }} className="w-full rtl:text-right ltr:text-left px-5 py-4 text-base font-black text-white hover:bg-white/5 transition-all border-t border-white/5">{t('add_education_menu')}</button>
                    <button onClick={handleLogout} className="w-full rtl:text-right ltr:text-left px-5 py-4 text-base font-black text-red-500 hover:bg-red-500/10 transition-all border-t border-white/5">{t('logout_menu')}</button>
                  </div>
                )}
              </div>
            )}

            {/* 🖼️ Cover Photo */}
            <div 
               className="h-64 md:h-[350px] relative group bg-slate-800 rounded-t-[2rem] overflow-hidden"
               style={profile?.cover_url ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
               {!profile?.cover_url && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>}
               {currentUser?.id === id && (
                  <label className="absolute top-4 rtl:right-4 ltr:left-4 bg-black/60 hover:bg-black/90 text-white text-xs font-black px-5 py-2.5 rounded-xl cursor-pointer transition-all z-20 shadow-lg border border-white/10">
                      {t('edit_cover')}
                      <input type="file" hidden accept="image/*" onChange={onSelectCover} />
                  </label>
               )}
            </div>

            <div className="px-8 md:px-12 pb-12 relative">
                {/* 🧑 Avatar */}
                <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end -mt-24 md:-mt-32 mb-6 relative z-10 gap-4">
                    <div 
                       onClick={() => setViewImage(profile?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${id}`)}
                       className="relative cursor-pointer group transition-transform hover:scale-105"
                    >
                        <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${id}`} className="w-40 h-40 md:w-52 md:h-52 rounded-full border-[8px] border-[#0f172a] object-cover bg-[#0f172a] shadow-xl" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-full bg-black/40 transition-all"><span className="text-white text-2xl">🔍</span></div>
                    </div>

                    <div className="flex gap-3 pb-4">
                        {currentUser?.id !== id && (
                            <button onClick={handleFollow} className={`px-10 py-3.5 rounded-full text-sm font-black transition-all shadow-md ${isFollowing ? 'bg-white/10 text-white' : 'bg-cyan-500 text-black hover:bg-cyan-400'}`}>
                                {isFollowing ? t('following_btn') : t('connect_node_btn')}
                            </button>
                        )}
                        {currentUser?.id !== id && (
                            <Link href={`/chat/${id}`} className="px-10 py-3.5 rounded-full text-sm font-black border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-900/30 transition-all shadow-sm">
                                {t('send_signal_btn')}
                            </Link>
                        )}
                    </div>
                </div>

                {/* Profile Data */}
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">{profile?.full_name || t('unknown_node')}</h1>
                        {profile?.is_verified && <svg className="w-8 h-8 text-cyan-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>}
                    </div>
                    
                    <p className="text-xl md:text-2xl text-cyan-400 font-black mt-2 tracking-tight">@{profile?.rank || t('developer_default')}</p>
                    
                    {profile?.bio && <p className="mt-4 text-base md:text-lg text-slate-300 max-w-4xl leading-relaxed font-bold">{profile.bio}</p>}

                    {/* ✅ Education Under Bio */}
                    {userEducation.length > 0 && (
                        <div className="mt-6 flex flex-col gap-3">
                            {userEducation.map(edu => (
                                <div key={edu.id} className="flex items-center gap-3 text-slate-300 font-bold text-sm md:text-base">
                                    <span className="text-xl">🎓</span>
                                    <span className="text-white">{edu.university} {edu.degree && `- ${edu.degree}`}</span>
                                    {currentUser?.id === id && (
                                        <button onClick={() => handleDeleteEdu(edu.id)} className="text-[10px] text-red-500 hover:underline bg-red-500/10 px-2 py-1 rounded">{t('remove_btn')}</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 📊 Stats */}
                    <div className="flex items-center gap-12 mt-8 border-t border-white/10 pt-8">
                        <button onClick={() => setShowModal('followers')} className="flex flex-col hover:text-cyan-400 transition-colors group text-left">
                            <span className="text-4xl font-black text-white group-hover:text-cyan-400">{stats.followers}</span> 
                            <span className="text-sm font-black uppercase tracking-widest text-slate-400 mt-2">{t('followers_tab')}</span>
                        </button>
                        <button onClick={() => setShowModal('following')} className="flex flex-col hover:text-cyan-400 transition-colors group text-left">
                            <span className="text-4xl font-black text-white group-hover:text-cyan-400">{stats.following}</span> 
                            <span className="text-sm font-black uppercase tracking-widest text-slate-400 mt-2">{t('following_tab')}</span>
                        </button>
                    </div>

                    <div className="mt-8 flex items-center gap-4">
                        {profile?.cv_url && (
                            <a href={profile.cv_url} target="_blank" className="px-8 py-4 rounded-xl text-sm font-black bg-white/10 text-white border border-white/5 shadow-md hover:bg-white/20 transition-all">
                                {profile.cv_url.toLowerCase().includes('.pdf') ? t('pdf_resume') : t('word_resume')}
                            </a>
                        )}
                        {currentUser?.id === id && (
                            <label className="px-8 py-4 rounded-xl text-sm font-black border-2 border-dashed border-white/20 text-slate-300 hover:border-cyan-400 hover:text-cyan-400 cursor-pointer transition-all flex items-center gap-2">
                                {uploadingMedia ? t('uploading_cv') : t('upload_cv')}
                                <input type="file" hidden accept=".pdf,.doc,.docx" onChange={handleCvUpload} disabled={uploadingMedia} />
                            </label>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* --- Tabs Header --- */}
        <div className="flex gap-10 mb-8 border-b-4 border-white/5 overflow-x-auto no-scrollbar px-4">
          {[{ id: 'posts', label: t('tab_snippets') }, { id: 'projects', label: t('tab_projects') }, { id: 'certs', label: t('tab_certs') }, { id: 'liked', label: t('tab_liked') }].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`pb-4 text-base font-black uppercase tracking-wider transition-all whitespace-nowrap border-b-4 ${activeTab === tab.id ? 'text-cyan-400 border-cyan-400' : 'text-slate-400 border-transparent'}`}>{tab.label}</button>
          ))}
        </div>

        {/* --- Tab Content --- */}
        <div className="space-y-10">
          {(activeTab === 'posts' || activeTab === 'liked') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {(activeTab === 'posts' ? userPosts : likedPosts).length === 0 ? (
                <div className="col-span-full text-center py-20 bg-[#0f172a] rounded-3xl border border-white/5"><p className="text-slate-300 font-black text-lg">{t('no_posts_found')}</p></div>
              ) : (
                (activeTab === 'posts' ? userPosts : likedPosts).map((post) => (
                  <div key={post.id} className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] p-8 shadow-sm flex flex-col hover:border-cyan-500/50 transition-all group">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${post.user_id}`} className="w-12 h-12 rounded-full object-cover" />
                            <div><h4 className="text-sm font-black text-white uppercase">{profile?.full_name}</h4><p className="text-xs text-slate-500 font-bold">{formatDistanceToNow(new Date(post.created_at))} {t('ago')}</p></div>
                        </div>
                        {currentUser?.id === id && activeTab === 'posts' && (
                           <button onClick={() => { setPostToDelete(post.id); setShowModal('delete'); }} className="text-xs font-black text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">{t('delete_btn')}</button>
                        )}
                    </div>
                    <Link href={`/post/${post.id}`} className="flex-1">
                        <h3 className="text-2xl font-black text-white hover:text-cyan-400 transition-colors mb-4 line-clamp-2">{post.title}</h3>
                        <div className="bg-[#010409] rounded-2xl p-6 border border-white/5 relative overflow-hidden h-40 mb-6">
                            <pre dir="ltr" className="text-left text-sm text-cyan-100/70 font-mono font-bold leading-relaxed"><code>{post.code}</code></pre>
                            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#010409] to-transparent"></div>
                        </div>
                    </Link>
                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                        <div className="flex gap-8 text-base font-black text-slate-400">
                            <button onClick={() => handleToggleLike(post.id, post.isLikedByMe)} className={`${post.isLikedByMe ? 'text-red-500' : 'hover:text-red-400'} transition-all`}>
                                {post.isLikedByMe ? '❤️' : '🤍'} {post.likes_count}
                            </button>
                            <Link href={`/post/${post.id}`}>💬 {post.comments_count}</Link>
                        </div>
                        <span className="text-xs font-black uppercase text-cyan-400 bg-cyan-500/10 px-4 py-2 rounded-xl">{post.language}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ✅ Projects Tab (مع زرار الحذف الجديد) */}
          {activeTab === 'projects' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {currentUser?.id === id && <button onClick={() => setShowModal('addProject')} className="col-span-full py-12 border-2 border-dashed border-white/20 rounded-3xl text-slate-400 font-black hover:text-cyan-400 hover:border-cyan-400 transition-all text-xl">{t('add_new_project')}</button>}
               {userProjects.map((project) => (
                 <div key={project.id} className="bg-[#0f172a] border border-white/5 rounded-3xl overflow-hidden shadow-xl flex flex-col items-start transition-all hover:border-cyan-500/30">
                    {project.media_url ? (
                        isVideo(project.media_url) ? <video src={project.media_url} autoPlay loop muted playsInline className="w-full h-64 object-cover bg-black" /> 
                        : <img src={project.media_url} className="w-full h-64 object-cover cursor-pointer" onClick={() => setViewImage(project.media_url)} />
                    ) : <div className="w-full h-48 bg-slate-800 flex items-center justify-center text-5xl">💻</div>}
                    <div className="p-8 w-full flex flex-col flex-1">
                        <div className="flex justify-between items-start w-full mb-3">
                            <h3 className="text-2xl font-black text-white">{project.title}</h3>
                            {currentUser?.id === id && (
                                <button onClick={() => handleDeleteProject(project.id)} className="text-xs font-black text-red-500 hover:text-white hover:bg-red-600 px-3 py-1.5 border border-red-500/30 rounded-lg transition-all ml-2 rtl:ml-0 rtl:mr-2">
                                    {t('delete_btn')}
                                </button>
                            )}
                        </div>
                        <p className="text-base text-slate-400 font-bold mb-6 flex-1 line-clamp-3">{project.description}</p>
                        <div className="flex gap-4 w-full pt-6 border-t border-white/5 mt-auto">
                            <a href={project.repo_url} target="_blank" className="flex-1 text-center text-sm font-black text-white bg-white/10 py-4 rounded-xl hover:bg-white/20 transition-all">{t('github_btn')}</a>
                            <a href={project.live_url} target="_blank" className="flex-1 text-center text-sm font-black text-black bg-cyan-500 py-4 rounded-xl hover:bg-cyan-400 transition-all">{t('live_demo_btn')}</a>
                        </div>
                    </div>
                 </div>
               ))}
             </div>
          )}

          {/* ✅ Certificates Tab (مع زرار الحذف الجديد) */}
          {activeTab === 'certs' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {currentUser?.id === id && <button onClick={() => setShowModal('addCert')} className="col-span-full py-12 border-2 border-dashed border-white/20 rounded-3xl text-slate-400 font-black hover:text-cyan-400 hover:border-cyan-400 transition-all text-xl">{t('add_new_cert')}</button>}
               {userCerts.map((cert) => (
                 <div key={cert.id} className="bg-[#0f172a] border border-white/5 rounded-3xl p-8 shadow-xl flex items-start gap-6 hover:border-amber-500/30 transition-all w-full">
                    {cert.image_url ? <img src={cert.image_url} className="w-24 h-24 rounded-2xl object-cover shrink-0 cursor-pointer border border-white/10 shadow-md" onClick={() => setViewImage(cert.image_url)} /> 
                    : <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-amber-500/20 text-4xl">🏆</div>}
                    <div className="flex-1 w-full">
                      <div className="flex justify-between items-start w-full mb-2">
                          <h3 className="text-2xl font-black text-white">{cert.title}</h3>
                          {currentUser?.id === id && (
                              <button onClick={() => handleDeleteCert(cert.id)} className="text-xs font-black text-red-500 hover:text-white hover:bg-red-600 px-3 py-1.5 border border-red-500/30 rounded-lg transition-all ml-2 rtl:ml-0 rtl:mr-2 shrink-0">
                                  {t('delete_btn')}
                              </button>
                          )}
                      </div>
                      <p className="text-lg text-slate-300 font-bold">{cert.issuer}</p>
                      {cert.issue_date && <p className="text-sm text-slate-500 mt-2 font-black">{t('issued')} {cert.issue_date}</p>}
                      {cert.credential_url && <a href={cert.credential_url} target="_blank" className="inline-block mt-4 text-sm font-black text-amber-500 hover:text-amber-400 bg-amber-500/10 px-5 py-2.5 rounded-xl transition-all">{t('verify_btn')}</a>}
                    </div>
                 </div>
               ))}
             </div>
          )}
        </div>

        {/* --- Image Viewer Modal --- */}
        {viewImage && (
          <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setViewImage(null)}>
            <button className="absolute top-6 rtl:left-8 ltr:right-8 text-white text-4xl font-black hover:text-cyan-400 transition-colors">✕</button>
            <img src={viewImage} className="max-w-full max-h-[90vh] rounded-[2rem] shadow-2xl object-contain border-[8px] border-white/10" onClick={(e) => e.stopPropagation()} />
          </div>
        )}

        {/* --- Cropper Modal --- */}
        {previewUpload && (
            <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center p-4 md:p-10 backdrop-blur-md">
                <div className="w-full max-w-3xl bg-[#0f172a] border border-white/10 rounded-[2rem] p-8 shadow-2xl flex flex-col h-[85vh]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-black text-white">{t('crop_photo')}</h3>
                        <button onClick={() => setPreviewUpload(null)} className="text-slate-400 hover:text-white text-3xl font-black">✕</button>
                    </div>
                    <div className="relative flex-1 bg-black rounded-2xl overflow-hidden shadow-inner border border-white/5">
                        <Cropper image={previewUpload.url} crop={crop} zoom={zoom} aspect={previewUpload.type === 'avatar' ? 1 : 21 / 9} cropShape={previewUpload.type === 'avatar' ? 'round' : 'rect'} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
                    </div>
                    <div className="mt-8 flex items-center gap-4 px-4" dir="ltr">
                        <span className="text-white">🔍-</span>
                        <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-cyan-500" />
                        <span className="text-white">🔍+</span>
                    </div>
                    <button onClick={confirmImageUpload} disabled={uploadingMedia} className="mt-8 bg-cyan-500 text-black font-black py-4 rounded-xl text-lg uppercase tracking-widest disabled:opacity-50">
                        {uploadingMedia ? t('syncing_picture') : t('save_picture')}
                    </button>
                </div>
            </div>
        )}

        {/* --- Form Modals --- */}
        {showModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f172a] border border-white/10 rounded-[2rem] w-full max-w-xl p-8 md:p-12 shadow-2xl relative overflow-y-auto max-h-[90vh]">
              <button onClick={() => setShowModal(null)} className="absolute top-6 rtl:left-8 ltr:right-8 text-3xl font-black text-slate-500 hover:text-white transition-colors">✕</button>
              
              {/* Add Project Modal */}
              {showModal === 'addProject' && (
                <>
                  <h3 className="text-3xl font-black text-white mb-8">{t('add_project_title')}</h3>
                  <div className="space-y-5">
                      <input placeholder={t('title_req')} value={projectData.title} onChange={e => setProjectData({...projectData, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-cyan-500" />
                      <textarea placeholder={t('description')} rows={3} value={projectData.description} onChange={e => setProjectData({...projectData, description: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-cyan-500 resize-none" />
                      <input placeholder={t('github_link')} value={projectData.repo_url} onChange={e => setProjectData({...projectData, repo_url: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-cyan-500 text-left" dir="ltr" />
                      <input placeholder={t('live_link')} value={projectData.live_url} onChange={e => setProjectData({...projectData, live_url: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-cyan-500 text-left" dir="ltr" />
                      <label className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-white/20 p-5 rounded-xl cursor-pointer hover:border-cyan-500 transition-all text-sm font-bold text-slate-400 bg-white/5">
                          {projectFile ? `✅ ${projectFile.name}` : t('upload_img_vid')}
                          <input type="file" hidden accept="image/*,video/*" onChange={(e) => setProjectFile(e.target.files?.[0] || null)} />
                      </label>
                      <button onClick={handleAddProject} disabled={uploadingMedia} className="w-full bg-cyan-500 text-black font-black py-4 rounded-xl mt-4 uppercase tracking-widest disabled:opacity-50">
                          {uploadingMedia ? t('saving') : t('save_project')}
                      </button>
                  </div>
                </>
              )}

              {/* Add Certificate Modal */}
              {showModal === 'addCert' && (
                <>
                  <h3 className="text-3xl font-black text-white mb-8">{t('add_cert_title')}</h3>
                  <div className="space-y-5">
                      <input placeholder={t('title_req')} value={certData.title} onChange={e => setCertData({...certData, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-cyan-500" />
                      <input placeholder={t('issuer_req')} value={certData.issuer} onChange={e => setCertData({...certData, issuer: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-cyan-500" />
                      <input type="date" value={certData.issue_date} onChange={e => setCertData({...certData, issue_date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-slate-400 outline-none focus:border-cyan-500" />
                      <input placeholder={t('cred_url')} value={certData.credential_url} onChange={e => setCertData({...certData, credential_url: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-cyan-500 text-left" dir="ltr" />
                      <label className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-white/20 p-5 rounded-xl cursor-pointer hover:border-cyan-500 transition-all text-sm font-bold text-slate-400 bg-white/5">
                          {certFile ? `✅ ${certFile.name}` : t('upload_img')}
                          <input type="file" hidden accept="image/*" onChange={(e) => setCertFile(e.target.files?.[0] || null)} />
                      </label>
                      <button onClick={handleAddCert} disabled={uploadingMedia} className="w-full bg-cyan-500 text-black font-black py-4 rounded-xl mt-4 uppercase tracking-widest disabled:opacity-50">
                          {uploadingMedia ? t('saving') : t('save_cert')}
                      </button>
                  </div>
                </>
              )}

              {/* Add Education Modal */}
              {showModal === 'addEdu' && (
                <>
                  <h3 className="text-3xl font-black text-white mb-8">{t('add_edu_title')}</h3>
                  <div className="space-y-5">
                      <input placeholder={t('university_req')} value={eduData.university} onChange={e => setEduData({...eduData, university: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-cyan-500" />
                      <input placeholder={t('degree')} value={eduData.degree} onChange={e => setEduData({...eduData, degree: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-cyan-500" />
                      <div className="flex gap-4">
                        <input placeholder={t('start_year')} value={eduData.start_year} onChange={e => setEduData({...eduData, start_year: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-cyan-500 text-left" dir="ltr" />
                        <input placeholder={t('end_year')} value={eduData.end_year} onChange={e => setEduData({...eduData, end_year: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-cyan-500 text-left" dir="ltr" />
                      </div>
                      <button onClick={handleAddEdu} className="w-full bg-cyan-700 text-white font-black py-4 rounded-xl mt-4 uppercase">{t('save_edu')}</button>
                  </div>
                </>
              )}

              {/* Edit Profile Modal */}
              {showModal === 'edit' && (
                 <>
                  <h3 className="text-3xl font-black text-white mb-8">{t('edit_identity')}</h3>
                  <div className="space-y-5">
                      <input value={editData.full_name} onChange={e => setEditData({...editData, full_name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-cyan-500" />
                      <input value={editData.rank} onChange={e => setEditData({...editData, rank: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-cyan-500" />
                      <textarea rows={4} value={editData.bio} onChange={e => setEditData({...editData, bio: e.target.value})} placeholder={t('bio_placeholder')} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-cyan-500 resize-none" />
                      <button onClick={async () => {
                         if (!editData.full_name.trim()) return toast.error("Name is required");
                         try {
                           const { error } = await supabase.from('profiles').update({ ...editData }).eq('id', id);
                           if (error) throw error;
                           setProfile((p: any) => ({ ...p, ...editData })); 
                           setShowModal(null); 
                           toast.success("Updated");
                         } catch (err) { toast.error("Update failed"); }
                      }} className="w-full bg-cyan-500 text-black font-black py-4 rounded-xl mt-4 uppercase">{t('update_node')}</button>
                  </div>
                </>
              )}

              {/* Delete Post Modal */}
              {showModal === 'delete' && (
                <div className="text-center pt-4">
                  <h3 className="text-3xl font-black uppercase text-red-500 mb-4">{t('warning')}</h3>
                  <p className="text-base text-slate-300 mb-8 font-bold">{t('delete_signal_forever')}</p>
                  <div className="flex gap-4">
                    <button onClick={handleDeletePost} className="flex-1 bg-red-600 text-white hover:bg-red-700 transition-all font-black py-4 rounded-xl uppercase">{t('delete_btn')}</button>
                    <button onClick={() => setShowModal(null)} className="flex-1 bg-white/5 text-white hover:bg-white/10 transition-all font-black py-4 rounded-xl uppercase">{t('cancel_btn')}</button>
                  </div>
                </div>
              )}

              {/* Followers / Following Modal */}
              {(showModal === 'followers' || showModal === 'following') && (
                <>
                  <h3 className="text-3xl font-black text-white mb-8">{showModal === 'followers' ? t('followers_tab') : t('following_tab')}</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto rtl:pl-2 ltr:pr-2 custom-scrollbar">
                    {(showModal === 'followers' ? followersList : followingList).length === 0 ? (
                      <p className="text-base text-slate-500 text-center py-4 font-bold">{t('no_signals_found')}</p>
                    ) : (
                      (showModal === 'followers' ? followersList : followingList).map((f: any) => (
                        <Link href={`/profile/${f.id}`} key={f.id} onClick={() => setShowModal(null)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/10">
                          <img src={f.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${f.id}`} className="w-16 h-16 rounded-full object-cover shadow-sm border border-white/10" />
                          <div><p className="font-black text-lg text-white uppercase">{f.full_name}</p><p className="text-sm font-bold text-cyan-400">{f.rank || t('developer_default')}</p></div>
                        </Link>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}