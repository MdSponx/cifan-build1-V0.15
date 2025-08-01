import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTypography } from '../../utils/typography';
import { useAuth } from '../auth/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import ExportService from '../../services/exportService';
import { useNotificationHelpers } from '../ui/NotificationSystem';
import { AdminApplicationData, ScoringCriteria } from '../../types/admin.types';
import AdminZoneHeader from '../layout/AdminZoneHeader';
import VideoScoringPanel from '../admin/VideoScoringPanel';
import AdminControlsPanel from '../admin/AdminControlsPanel';
import VideoSection from '../applications/VideoSection';
import { 
  Eye, 
  Star, 
  Flag, 
  User, 
  Phone, 
  Mail, 
  School, 
  Globe, 
  Calendar,
  Clock,
  Download,
  FileText,
  Image,
  Video,
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';

interface AdminApplicationDetailPageProps {
  applicationId: string;
  onSidebarToggle?: () => void;
}

interface ContactInfo {
  name: string;
  nameTh?: string;
  age?: number;
  phone: string;
  email: string;
  role: string;
  customRole?: string;
}

interface CrewMember {
  id: string;
  fullName: string;
  fullNameTh?: string;
  role: string;
  customRole?: string;
  age: number;
  phone?: string;
  email?: string;
  schoolName?: string;
  studentId?: string;
}

const AdminApplicationDetailPage: React.FC<AdminApplicationDetailPageProps> = ({ 
  applicationId, 
  onSidebarToggle 
}) => {
  const { i18n } = useTranslation();
  const { getClass } = useTypography();
  const { user } = useAuth();
  const currentLanguage = i18n.language as 'en' | 'th';

  const [application, setApplication] = useState<AdminApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScoringPanel, setShowScoringPanel] = useState(false);
  const [currentScores, setCurrentScores] = useState<Partial<ScoringCriteria>>({});
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // UI State
  const [crewSearchTerm, setCrewSearchTerm] = useState('');
  const [crewSortBy, setCrewSortBy] = useState<'name' | 'role' | 'age'>('name');
  const [crewSortOrder, setCrewSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showAllCrew, setShowAllCrew] = useState(false);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['film-info', 'contact-info']));

  const { showSuccess, showError } = useNotificationHelpers();

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Load application data
  useEffect(() => {
    const loadApplication = async () => {
      if (!applicationId) {
        setError(currentLanguage === 'th' ? 'ไม่พบรหัสใบสมัคร' : 'Application ID not found');
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'submissions', applicationId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          setError(currentLanguage === 'th' ? 'ไม่พบใบสมัครที่ระบุ' : 'Application not found');
          return;
        }
        
        const data = docSnap.data();
        
        // Map Firestore data to AdminApplicationData type
        const realApplication: AdminApplicationData = {
          id: docSnap.id,
          userId: data.userId || '',
          applicationId: data.applicationId || docSnap.id,
          competitionCategory: data.competitionCategory || data.category || 'youth',
          status: data.status || 'draft',
          filmTitle: data.filmTitle || 'Untitled',
          filmTitleTh: data.filmTitleTh,
          genres: data.genres || [],
          format: data.format || 'live-action',
          duration: data.duration || 0,
          synopsis: data.synopsis || '',
          chiangmaiConnection: data.chiangmaiConnection,
          
          // Submitter/Director data
          submitterName: data.submitterName || data.directorName || '',
          submitterNameTh: data.submitterNameTh || data.directorNameTh,
          submitterAge: data.submitterAge || data.directorAge,
          submitterPhone: data.submitterPhone || data.directorPhone || '',
          submitterEmail: data.submitterEmail || data.directorEmail || '',
          submitterRole: data.submitterRole || data.directorRole || '',
          
          // Files with proper fallback handling
          files: {
            filmFile: {
              url: data.files?.filmFile?.downloadURL || data.files?.filmFile?.url || '',
              name: data.files?.filmFile?.fileName || data.files?.filmFile?.name || 'Film file',
              size: data.files?.filmFile?.fileSize || data.files?.filmFile?.size || 0
            },
            posterFile: {
              url: data.files?.posterFile?.downloadURL || data.files?.posterFile?.url || '',
              name: data.files?.posterFile?.fileName || data.files?.posterFile?.name || 'Poster file',
              size: data.files?.posterFile?.fileSize || data.files?.posterFile?.size || 0
            },
            proofFile: data.files?.proofFile ? {
              url: data.files?.proofFile?.downloadURL || data.files?.proofFile?.url || '',
              name: data.files?.proofFile?.fileName || data.files?.proofFile?.name || 'Proof file',
              size: data.files?.proofFile?.fileSize || data.files?.proofFile?.size || 0
            } : undefined
          },
          
          // Additional data from Firestore
          nationality: data.nationality || 'Unknown',
          schoolName: data.schoolName,
          studentId: data.studentId,
          universityName: data.universityName,
          faculty: data.faculty,
          universityId: data.universityId,
          crewMembers: data.crewMembers || [],
          
          // Admin-specific data
          scores: data.scores || [],
          adminNotes: data.adminNotes || '',
          reviewStatus: data.reviewStatus || 'pending',
          flagged: data.flagged || false,
          flagReason: data.flagReason,
          assignedReviewers: data.assignedReviewers || [],
          
          // Timestamps
          submittedAt: data.submittedAt?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          lastModified: data.lastModified?.toDate() || new Date(),
          lastReviewedAt: data.lastReviewedAt?.toDate()
        };

        setApplication(realApplication);
        
        // Check if current user has already scored
        const userScore = realApplication.scores.find(score => score.adminId === user?.uid);
        if (userScore) {
          setCurrentScores(userScore);
        }
        
      } catch (error) {
        console.error('Error loading application:', error);
        setError(currentLanguage === 'th' ? 'เกิดข้อผิดพลาดในการโหลดข้อมูล' : 'Error loading application data');
      } finally {
        setLoading(false);
      }
    };

    loadApplication();
  }, [applicationId, user?.uid, currentLanguage]);

  const content = {
    th: {
      pageTitle: "รายละเอียดใบสมัคร",
      subtitle: "ดูและประเมินผลงานภาพยนตร์",
      loading: "กำลังโหลด...",
      
      // Sections
      filmInformation: "ข้อมูลภาพยนตร์",
      contactInformation: "ข้อมูลติดต่อ",
      crewTable: "ตารางทีมงาน",
      proofDocuments: "เอกสารหลักฐาน",
      applicationTimeline: "ไทม์ไลน์การสมัคร",
      
      // Film Info
      nationality: "สัญชาติ",
      language: "ภาษา",
      subtitles: "คำบรรยาย",
      productionYear: "ปีที่ผลิต",
      formatDetails: "รายละเอียดรูปแบบ",
      genres: "แนวภาพยนตร์",
      duration: "ความยาว",
      synopsis: "เรื่องย่อ",
      chiangmaiConnection: "ความเกี่ยวข้องกับเชียงใหม่",
      
      // Contact Info
      personalDetails: "ข้อมูลส่วนตัว",
      contactDetails: "ข้อมูลติดต่อ",
      educationalDetails: "ข้อมูลการศึกษา",
      roleInFilm: "บทบาทในภาพยนตร์",
      age: "อายุ",
      yearsOld: "ปี",
      phone: "โทรศัพท์",
      email: "อีเมล",
      school: "โรงเรียน",
      university: "มหาวิทยาลัย",
      faculty: "คณะ/สาขา",
      studentId: "รหัสนักเรียน/นักศึกษา",
      
      // Crew Table
      crewMembers: "สมาชิกทีมงาน",
      searchCrew: "ค้นหาทีมงาน...",
      sortBy: "เรียงตาม",
      name: "ชื่อ",
      role: "บทบาท",
      contact: "ติดต่อ",
      institution: "สถาบัน",
      totalCrew: "ทีมงานทั้งหมด",
      showAll: "แสดงทั้งหมด",
      showLess: "แสดงน้อยลง",
      noCrew: "ไม่มีทีมงานเพิ่มเติม",
      exportCrew: "ส่งออกรายชื่อทีมงาน",
      
      // Files
      filmFile: "ไฟล์ภาพยนตร์",
      posterFile: "โปสเตอร์",
      proofFile: "เอกสารหลักฐาน",
      fileSize: "ขนาดไฟล์",
      uploadDate: "วันที่อัปโหลด",
      fileStatus: "สถานะไฟล์",
      verified: "ตรวจสอบแล้ว",
      needsReview: "ต้องตรวจสอบ",
      missing: "ไฟล์หายไป",
      download: "ดาวน์โหลด",
      preview: "ดูตัวอย่าง",
      copyLink: "คัดลอกลิงก์",
      
      // Timeline
      draftCreated: "สร้างร่าง",
      lastModified: "แก้ไขล่าสุด",
      submitted: "ส่งใบสมัคร",
      underReview: "เริ่มพิจารณา",
      reviewed: "พิจารณาแล้ว",
      
      // Actions
      toggleScoring: "แผงให้คะแนน",
      hideScoring: "ซ่อนแผงให้คะแนน",
      averageScore: "คะแนนเฉลี่ย",
      totalScores: "จำนวนผู้ตัดสิน",
      lastReviewed: "ตรวจสอบล่าสุด",
      flagged: "ตั้งค่าสถานะพิเศษ"
    },
    en: {
      pageTitle: "Application Details",
      subtitle: "View and evaluate film submission",
      loading: "Loading...",
      
      // Sections
      filmInformation: "Film Information",
      contactInformation: "Contact Information",
      crewTable: "Crew Table",
      proofDocuments: "Proof Documents",
      applicationTimeline: "Application Timeline",
      
      // Film Info
      nationality: "Nationality",
      language: "Language",
      subtitles: "Subtitles",
      productionYear: "Production Year",
      formatDetails: "Format Details",
      genres: "Genres",
      duration: "Duration",
      synopsis: "Synopsis",
      chiangmaiConnection: "Connection to Chiang Mai",
      
      // Contact Info
      personalDetails: "Personal Details",
      contactDetails: "Contact Details",
      educationalDetails: "Educational Details",
      roleInFilm: "Role in Film",
      age: "Age",
      yearsOld: "years old",
      phone: "Phone",
      email: "Email",
      school: "School",
      university: "University",
      faculty: "Faculty/Department",
      studentId: "Student ID",
      
      // Crew Table
      crewMembers: "Crew Members",
      searchCrew: "Search crew...",
      sortBy: "Sort by",
      name: "Name",
      role: "Role",
      contact: "Contact",
      institution: "Institution",
      totalCrew: "Total Crew",
      showAll: "Show All",
      showLess: "Show Less",
      noCrew: "No additional crew members",
      exportCrew: "Export Crew List",
      
      // Files
      filmFile: "Film File",
      posterFile: "Poster",
      proofFile: "Proof Document",
      fileSize: "File Size",
      uploadDate: "Upload Date",
      fileStatus: "File Status",
      verified: "Verified",
      needsReview: "Needs Review",
      missing: "Missing File",
      download: "Download",
      preview: "Preview",
      copyLink: "Copy Link",
      
      // Timeline
      draftCreated: "Draft Created",
      lastModified: "Last Modified",
      submitted: "Submitted",
      underReview: "Under Review",
      reviewed: "Reviewed",
      
      // Actions
      toggleScoring: "Show Scoring Panel",
      hideScoring: "Hide Scoring Panel",
      averageScore: "Average Score",
      totalScores: "Total Judges",
      lastReviewed: "Last Reviewed",
      flagged: "Flagged"
    }
  };

  const currentContent = content[currentLanguage];

  // Helper functions
  const getContactInfo = (): ContactInfo => {
    if (!application) return { name: '', phone: '', email: '', role: '' };
    
    const isWorldCategory = application.competitionCategory === 'world';
    return {
      name: isWorldCategory ? (application as any).directorName || application.submitterName || '' : application.submitterName || '',
      nameTh: isWorldCategory ? (application as any).directorNameTh || application.submitterNameTh : application.submitterNameTh,
      age: isWorldCategory ? (application as any).directorAge || application.submitterAge : application.submitterAge,
      phone: isWorldCategory ? (application as any).directorPhone || application.submitterPhone || '' : application.submitterPhone || '',
      email: isWorldCategory ? (application as any).directorEmail || application.submitterEmail || '' : application.submitterEmail || '',
      role: isWorldCategory ? (application as any).directorRole || application.submitterRole || '' : application.submitterRole || '',
      customRole: isWorldCategory ? (application as any).directorCustomRole : (application as any).submitterCustomRole
    };
  };

  const getEducationalInfo = () => {
    if (!application) return null;
    
    if (application.competitionCategory === 'youth') {
      return {
        type: 'school',
        institution: (application as any).schoolName || '',
        id: (application as any).studentId || ''
      };
    } else if (application.competitionCategory === 'future') {
      return {
        type: 'university',
        institution: (application as any).universityName || '',
        faculty: (application as any).faculty || '',
        id: (application as any).universityId || ''
      };
    }
    return null;
  };

  const getFilteredAndSortedCrew = () => {
    if (!application?.crewMembers) return [];
    
    let filtered = application.crewMembers.filter((member: any) =>
      member.fullName?.toLowerCase().includes(crewSearchTerm.toLowerCase()) ||
      member.fullNameTh?.toLowerCase().includes(crewSearchTerm.toLowerCase()) ||
      member.role?.toLowerCase().includes(crewSearchTerm.toLowerCase())
    );

    filtered.sort((a: any, b: any) => {
      let aValue, bValue;
      
      switch (crewSortBy) {
        case 'name':
          aValue = a.fullName || '';
          bValue = b.fullName || '';
          break;
        case 'role':
          aValue = a.role || '';
          bValue = b.role || '';
          break;
        case 'age':
          aValue = a.age || 0;
          bValue = b.age || 0;
          break;
        default:
          return 0;
      }

      if (crewSortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return showAllCrew ? filtered : filtered.slice(0, 5);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || isNaN(bytes)) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return date.toLocaleDateString(currentLanguage === 'th' ? 'th-TH' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCountryFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      'Thailand': '🇹🇭',
      'Japan': '🇯🇵',
      'South Korea': '🇰🇷',
      'Singapore': '🇸🇬',
      'Malaysia': '🇲🇾',
      'Philippines': '🇵🇭',
      'Vietnam': '🇻🇳',
      'Indonesia': '🇮🇩',
      'Taiwan': '🇹🇼',
      'China': '🇨🇳',
      'India': '🇮🇳',
      'Australia': '🇦🇺',
      'United States': '🇺🇸',
      'United Kingdom': '🇬🇧',
      'Germany': '🇩🇪',
      'France': '🇫🇷'
    };
    return flags[nationality] || '🌍';
  };

  const getCategoryLogo = (category: string) => {
    const logos = {
      youth: "https://firebasestorage.googleapis.com/v0/b/cifan-c41c6.firebasestorage.app/o/site_files%2Ffest_logos%2FGroup%202.png?alt=media&token=e8be419f-f0b2-4f64-8d7f-c3e8532e2689",
      future: "https://firebasestorage.googleapis.com/v0/b/cifan-c41c6.firebasestorage.app/o/site_files%2Ffest_logos%2FGroup%203.png?alt=media&token=b66cd708-0dc3-4c05-bc56-b2f99a384287",
      world: "https://firebasestorage.googleapis.com/v0/b/cifan-c41c6.firebasestorage.app/o/site_files%2Ffest_logos%2FGroup%204.png?alt=media&token=84ad0256-2322-4999-8e9f-d2f30c7afa67"
    };
    return logos[category as keyof typeof logos];
  };

  const getFileStatusIcon = (file: any) => {
    if (!file?.url) return <XCircle className="w-4 h-4 text-red-400" />;
    return <CheckCircle className="w-4 h-4 text-green-400" />;
  };

  const getFileStatusText = (file: any) => {
    if (!file?.url) return currentContent.missing;
    return currentContent.verified;
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showSuccess(currentLanguage === 'th' ? 'คัดลอกลิงก์แล้ว' : 'Link copied to clipboard');
    } catch (error) {
      showError(currentLanguage === 'th' ? 'ไม่สามารถคัดลอกลิงก์ได้' : 'Failed to copy link');
    }
  };

  const handleFileDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Event handlers for admin actions
  const handleScoreChange = (scores: Partial<ScoringCriteria>) => {
    setCurrentScores(scores);
  };

  const handleSaveScores = async (scores: ScoringCriteria) => {
    setIsSubmittingScore(true);
    try {
      const docRef = doc(db, 'submissions', applicationId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const currentData = docSnap.data();
        const currentScores = currentData.scores || [];
        
        const updatedScores = currentScores.filter((score: any) => score.adminId !== user?.uid);
        updatedScores.push({ ...scores, scoredAt: new Date() });
        
        await updateDoc(docRef, {
          scores: updatedScores,
          lastReviewedAt: new Date(),
          lastModified: new Date()
        });
      }
      
      if (application) {
        const updatedScores = application.scores.filter(score => score.adminId !== user?.uid);
        updatedScores.push(scores);
        
        setApplication(prev => prev ? {
          ...prev,
          scores: updatedScores,
          lastReviewedAt: new Date()
        } : null);
      }
      
      showSuccess(
        currentLanguage === 'th' ? 'บันทึกคะแนนเรียบร้อย' : 'Scores saved successfully'
      );
    } catch (error) {
      console.error('Error saving scores:', error);
      showError(
        currentLanguage === 'th' ? 'เกิดข้อผิดพลาดในการบันทึก' : 'Error saving scores'
      );
    } finally {
      setIsSubmittingScore(false);
    }
  };

  const handleStatusChange = async (status: AdminApplicationData['reviewStatus']) => {
    setIsUpdatingStatus(true);
    try {
      const docRef = doc(db, 'submissions', applicationId);
      await updateDoc(docRef, {
        reviewStatus: status,
        lastReviewedAt: new Date(),
        lastModified: new Date()
      });
      
      setApplication(prev => prev ? { ...prev, reviewStatus: status } : null);
      showSuccess(currentLanguage === 'th' ? 'อัปเดตสถานะเรียบร้อย' : 'Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      showError(currentLanguage === 'th' ? 'เกิดข้อผิดพลาดในการอัปเดต' : 'Error updating status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleNotesChange = async (notes: string) => {
    try {
      const docRef = doc(db, 'submissions', applicationId);
      await updateDoc(docRef, {
        adminNotes: notes,
        lastModified: new Date()
      });
      
      setApplication(prev => prev ? { ...prev, adminNotes: notes } : null);
      showSuccess(currentLanguage === 'th' ? 'บันทึกหมายเหตุเรียบร้อย' : 'Notes saved successfully');
    } catch (error) {
      console.error('Error saving notes:', error);
      showError(currentLanguage === 'th' ? 'เกิดข้อผิดพลาดในการบันทึก' : 'Error saving notes');
    }
  };

  const handleFlagToggle = async (flagged: boolean, reason?: string) => {
    try {
      const docRef = doc(db, 'submissions', applicationId);
      const updateData: any = { flagged, lastModified: new Date() };
      
      if (flagged && reason) {
        updateData.flagReason = reason;
      } else if (!flagged) {
        updateData.flagReason = null;
      }
      
      await updateDoc(docRef, updateData);
      setApplication(prev => prev ? { ...prev, flagged, flagReason: reason } : null);
      
      const message = flagged 
        ? (currentLanguage === 'th' ? 'ตั้งค่าสถานะพิเศษเรียบร้อย' : 'Application flagged successfully')
        : (currentLanguage === 'th' ? 'ยกเลิกสถานะพิเศษเรียบร้อย' : 'Application unflagged successfully');
      
      showSuccess(message);
    } catch (error) {
      console.error('Error toggling flag:', error);
      showError(currentLanguage === 'th' ? 'เกิดข้อผิดพลาด' : 'Error updating flag status');
    }
  };

  const handleExport = () => {
    if (!application) return;
    
    const exportService = new ExportService();
    exportService.exportApplicationPDF(application)
      .then(() => {
        showSuccess(
          currentLanguage === 'th' ? 'ส่งออกสำเร็จ' : 'Export Successful',
          currentLanguage === 'th' ? 'ไฟล์ PDF ถูกสร้างเรียบร้อยแล้ว' : 'PDF file has been generated successfully'
        );
      })
      .catch(() => {
        showError(
          currentLanguage === 'th' ? 'การส่งออกล้มเหลว' : 'Export Failed',
          currentLanguage === 'th' ? 'เกิดข้อผิดพลาดในการสร้าง PDF' : 'An error occurred while generating PDF'
        );
      });
  };

  const handlePrint = () => {
    window.print();
  };

  const calculateAverageScore = () => {
    if (!application || application.scores.length === 0) return 0;
    return application.scores.reduce((sum, score) => sum + score.totalScore, 0) / application.scores.length;
  };

  // Loading State
  if (loading) {
    return (
      <div className="space-y-8">
        <AdminZoneHeader
          title={currentContent.pageTitle}
          subtitle={currentContent.subtitle}
          onSidebarToggle={onSidebarToggle || (() => {})}
        />
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FCB283] mb-4"></div>
          <p className={`${getClass('body')} text-white/80`}>
            {currentContent.loading}
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="space-y-8">
        <AdminZoneHeader
          title={currentContent.pageTitle}
          subtitle={currentContent.subtitle}
          showBackButton={true}
          onBackClick={() => window.location.hash = '#admin/gallery'}
          onSidebarToggle={onSidebarToggle || (() => {})}
        />
        
        <div className="text-center py-12">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className={`text-2xl ${getClass('header')} mb-4 text-white`}>
            {error}
          </h2>
        </div>
      </div>
    );
  }

  if (!application) return null;

  const contactInfo = getContactInfo();
  const educationalInfo = getEducationalInfo();
  const filteredCrew = getFilteredAndSortedCrew();
  const averageScore = calculateAverageScore();

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Admin Zone Header */}
      <AdminZoneHeader
        title={application.filmTitle}
        subtitle={currentContent.subtitle}
        showBackButton={true}
        backButtonText={currentLanguage === 'th' ? 'กลับแกลเลอรี่' : 'Back to Gallery'}
        onBackClick={() => window.location.hash = '#admin/gallery'}
        onSidebarToggle={onSidebarToggle || (() => {})}
      >
        <div className="flex items-center space-x-4">
          {/* Score Summary */}
          {application.scores.length > 0 && (
            <div className="flex items-center space-x-2 px-3 py-2 glass-card rounded-lg">
              <Star className="w-4 h-4 text-[#FCB283]" />
              <span className={`text-sm ${getClass('body')} text-white`}>
                {averageScore.toFixed(1)}/40
              </span>
              <span className={`text-xs ${getClass('body')} text-white/60`}>
                ({application.scores.length} {currentLanguage === 'th' ? 'คะแนน' : 'scores'})
              </span>
            </div>
          )}
          
          {/* Flag Indicator */}
          {application.flagged && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
              <Flag className="w-4 h-4 text-red-400" />
              <span className={`text-red-400 text-sm ${getClass('body')}`}>
                {currentContent.flagged}
              </span>
            </div>
          )}
          
          {/* Competition Logo */}
          <img 
            src={getCategoryLogo(application.competitionCategory)}
            alt={`${application.competitionCategory} Competition Logo`}
            className="h-12 w-auto object-contain"
          />
        </div>
      </AdminZoneHeader>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Left Column: Application Content */}
        <div className="xl:col-span-2 space-y-6 sm:space-y-8">
          
          {/* 1. Enhanced Film Information Section */}
          <div className="glass-container rounded-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl ${getClass('header')} text-white flex items-center space-x-2`}>
                <Video className="w-6 h-6 text-[#FCB283]" />
                <span>{currentContent.filmInformation}</span>
              </h3>
              <button
                onClick={() => toggleSection('film-info')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {expandedSections.has('film-info') ? 
                  <ChevronUp className="w-5 h-5 text-white/60" /> : 
                  <ChevronDown className="w-5 h-5 text-white/60" />
                }
              </button>
            </div>

            {expandedSections.has('film-info') && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Poster */}
                <div className="lg:col-span-1">
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-white/5 border border-white/10">
                    {application.files.posterFile.url ? (
                      <img
                        src={application.files.posterFile.url}
                        alt={`${application.filmTitle} Poster`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-full flex flex-col items-center justify-center text-white/60">
                                <div class="text-4xl mb-2">🖼️</div>
                                <div class="text-sm text-center px-4">
                                  ${currentLanguage === 'th' ? 'ไม่สามารถโหลดโปสเตอร์ได้' : 'Poster not available'}
                                </div>
                              </div>
                            `;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/60">
                        <div className="text-4xl mb-2">🖼️</div>
                        <div className="text-sm text-center px-4">
                          {currentLanguage === 'th' ? 'ไม่มีโปสเตอร์' : 'No poster available'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Film Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Title and Category */}
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h1 className={`text-2xl sm:text-3xl ${getClass('header')} text-white mb-2 leading-tight`}>
                          {currentLanguage === 'th' && application.filmTitleTh 
                            ? application.filmTitleTh 
                            : application.filmTitle}
                        </h1>
                        {application.filmTitleTh && (
                          <h2 className={`text-lg ${getClass('subtitle')} text-[#FCB283] opacity-80`}>
                            {currentLanguage === 'th' ? application.filmTitle : application.filmTitleTh}
                          </h2>
                        )}
                      </div>
                      
                      {/* Competition Category Badge */}
                      <div className="flex items-center space-x-2 px-4 py-2 glass-card rounded-xl">
                        <img 
                          src={getCategoryLogo(application.competitionCategory)}
                          alt={`${application.competitionCategory} logo`}
                          className="h-6 w-auto object-contain"
                        />
                        <span className={`text-sm ${getClass('subtitle')} text-[#FCB283] capitalize`}>
                          {application.competitionCategory}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Film Metadata Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nationality */}
                    <div className="glass-card p-4 rounded-xl">
                      <div className="flex items-center space-x-2 mb-2">
                        <Globe className="w-4 h-4 text-[#FCB283]" />
                        <h4 className={`text-sm ${getClass('subtitle')} text-white/80`}>
                          {currentContent.nationality}
                        </h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getCountryFlag((application as any).nationality || 'Unknown')}</span>
                        <p className={`${getClass('body')} text-white`}>
                          {(application as any).nationality || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Format and Duration */}
                    <div className="glass-card p-4 rounded-xl">
                      <div className="flex items-center space-x-2 mb-2">
                        <Video className="w-4 h-4 text-[#FCB283]" />
                        <h4 className={`text-sm ${getClass('subtitle')} text-white/80`}>
                          {currentContent.formatDetails}
                        </h4>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{application.format === 'live-action' ? '🎬' : '🎨'}</span>
                          <p className={`${getClass('body')} text-white capitalize`}>
                            {application.format.replace('-', ' ')}
                          </p>
                        </div>
                        <p className={`${getClass('body')} text-white/70 text-sm`}>
                          {application.duration} {currentLanguage === 'th' ? 'นาที' : 'minutes'}
                        </p>
                      </div>
                    </div>

                    {/* Director/Submitter */}
                    <div className="glass-card p-4 rounded-xl">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="w-4 h-4 text-[#FCB283]" />
                        <h4 className={`text-sm ${getClass('subtitle')} text-white/80`}>
                          {application.competitionCategory === 'world' ? 
                            (currentLanguage === 'th' ? 'ผู้กำกับ' : 'Director') :
                            (currentLanguage === 'th' ? 'ผู้ส่งผลงาน' : 'Submitter')
                          }
                        </h4>
                      </div>
                      <p className={`${getClass('body')} text-white`}>
                        {currentLanguage === 'th' && contactInfo.nameTh 
                          ? contactInfo.nameTh 
                          : contactInfo.name}
                      </p>
                      {contactInfo.nameTh && (
                        <p className={`${getClass('body')} text-white/60 text-sm`}>
                          {currentLanguage === 'th' ? contactInfo.name : contactInfo.nameTh}
                        </p>
                      )}
                    </div>

                    {/* Production Year */}
                    <div className="glass-card p-4 rounded-xl">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-4 h-4 text-[#FCB283]" />
                        <h4 className={`text-sm ${getClass('subtitle')} text-white/80`}>
                          {currentContent.productionYear}
                        </h4>
                      </div>
                      <p className={`${getClass('body')} text-white`}>
                        {application.createdAt.getFullYear()}
                      </p>
                    </div>
                  </div>

                  {/* Genre Tags */}
                  <div>
                    <h4 className={`text-sm ${getClass('subtitle')} text-white/80 mb-3`}>
                      {currentContent.genres}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {application.genres.map((genre, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-[#FCB283]/20 text-[#FCB283] rounded-full text-sm border border-[#FCB283]/30 hover:bg-[#FCB283]/30 transition-colors"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Synopsis */}
                  <div>
                    <h4 className={`text-lg ${getClass('subtitle')} text-white mb-3`}>
                      {currentContent.synopsis}
                    </h4>
                    <div className="glass-card p-4 rounded-xl">
                      <p className={`${getClass('body')} text-white/90 leading-relaxed whitespace-pre-wrap`}>
                        {application.synopsis}
                      </p>
                    </div>
                  </div>

                  {/* Chiang Mai Connection */}
                  {application.chiangmaiConnection && (
                    <div>
                      <h4 className={`text-lg ${getClass('subtitle')} text-white mb-3`}>
                        {currentContent.chiangmaiConnection}
                      </h4>
                      <div className="glass-card p-4 rounded-xl">
                        <p className={`${getClass('body')} text-white/90 leading-relaxed whitespace-pre-wrap`}>
                          {application.chiangmaiConnection}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Complete Contact Information Section */}
          <div className="glass-container rounded-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl ${getClass('header')} text-white flex items-center space-x-2`}>
                <User className="w-6 h-6 text-[#FCB283]" />
                <span>{currentContent.contactInformation}</span>
              </h3>
              <button
                onClick={() => toggleSection('contact-info')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {expandedSections.has('contact-info') ? 
                  <ChevronUp className="w-5 h-5 text-white/60" /> : 
                  <ChevronDown className="w-5 h-5 text-white/60" />
                }
              </button>
            </div>

            {expandedSections.has('contact-info') && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Personal Details */}
                <div className="glass-card p-6 rounded-xl">
                  <h4 className={`text-lg ${getClass('subtitle')} text-[#FCB283] mb-4`}>
                    {currentContent.personalDetails}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className={`text-sm ${getClass('body')} text-white/60`}>
                        {currentContent.name}
                      </label>
                      <p className={`${getClass('body')} text-white font-medium`}>
                        {currentLanguage === 'th' && contactInfo.nameTh 
                          ? contactInfo.nameTh 
                          : contactInfo.name}
                      </p>
                      {contactInfo.nameTh && (
                        <p className={`${getClass('body')} text-white/60 text-sm`}>
                          {currentLanguage === 'th' ? contactInfo.name : contactInfo.nameTh}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className={`text-sm ${getClass('body')} text-white/60`}>
                        {currentContent.age}
                      </label>
                      <p className={`${getClass('body')} text-white`}>
                        {contactInfo.age} {currentContent.yearsOld}
                      </p>
                    </div>
                    
                    <div>
                      <label className={`text-sm ${getClass('body')} text-white/60`}>
                        {currentContent.roleInFilm}
                      </label>
                      <p className={`${getClass('body')} text-white`}>
                        {contactInfo.role === 'Other' ? contactInfo.customRole : contactInfo.role}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="glass-card p-6 rounded-xl">
                  <h4 className={`text-lg ${getClass('subtitle')} text-[#FCB283] mb-4`}>
                    {currentContent.contactDetails}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className={`text-sm ${getClass('body')} text-white/60 flex items-center space-x-2`}>
                        <Phone className="w-4 h-4" />
                        <span>{currentContent.phone}</span>
                      </label>
                      <div className="flex items-center space-x-2">
                        <p className={`${getClass('body')} text-white`}>
                          {contactInfo.phone}
                        </p>
                        <button
                          onClick={() => window.open(`tel:${contactInfo.phone}`)}
                          className="p-1 rounded hover:bg-white/10 transition-colors"
                          title="Call"
                        >
                          <Phone className="w-4 h-4 text-[#FCB283]" />
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className={`text-sm ${getClass('body')} text-white/60 flex items-center space-x-2`}>
                        <Mail className="w-4 h-4" />
                        <span>{currentContent.email}</span>
                      </label>
                      <div className="flex items-center space-x-2">
                        <p className={`${getClass('body')} text-white break-all`}>
                          {contactInfo.email}
                        </p>
                        <button
                          onClick={() => window.open(`mailto:${contactInfo.email}`)}
                          className="p-1 rounded hover:bg-white/10 transition-colors"
                          title="Send Email"
                        >
                          <Mail className="w-4 h-4 text-[#FCB283]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Educational Details */}
                {educationalInfo && (
                  <div className="lg:col-span-2">
                    <div className="glass-card p-6 rounded-xl">
                      <h4 className={`text-lg ${getClass('subtitle')} text-[#FCB283] mb-4 flex items-center space-x-2`}>
                        <School className="w-5 h-5" />
                        <span>{currentContent.educationalDetails}</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={`text-sm ${getClass('body')} text-white/60`}>
                            {educationalInfo.type === 'school' ? currentContent.school : currentContent.university}
                          </label>
                          <p className={`${getClass('body')} text-white`}>
                            {educationalInfo.institution}
                          </p>
                        </div>
                        
                        {educationalInfo.faculty && (
                          <div>
                            <label className={`text-sm ${getClass('body')} text-white/60`}>
                              {currentContent.faculty}
                            </label>
                            <p className={`${getClass('body')} text-white`}>
                              {educationalInfo.faculty}
                            </p>
                          </div>
                        )}
                        
                        <div>
                          <label className={`text-sm ${getClass('body')} text-white/60`}>
                            {currentContent.studentId}
                          </label>
                          <p className={`${getClass('body')} text-white font-mono`}>
                            {educationalInfo.id}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Comprehensive Crew Table */}
          <div className="glass-container rounded-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl ${getClass('header')} text-white flex items-center space-x-2`}>
                <Users className="w-6 h-6 text-[#FCB283]" />
                <span>{currentContent.crewMembers}</span>
                <span className="px-2 py-1 bg-[#FCB283]/20 text-[#FCB283] rounded-full text-sm">
                  {application.crewMembers?.length || 0}
                </span>
              </h3>
              <button
                onClick={() => toggleSection('crew-table')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {expandedSections.has('crew-table') ? 
                  <ChevronUp className="w-5 h-5 text-white/60" /> : 
                  <ChevronDown className="w-5 h-5 text-white/60" />
                }
              </button>
            </div>

            {expandedSections.has('crew-table') && (
              <>
                {application.crewMembers && application.crewMembers.length > 0 ? (
                  <div className="space-y-4">
                    
                    {/* Crew Controls */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      {/* Search */}
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
                        <input
                          type="text"
                          placeholder={currentContent.searchCrew}
                          value={crewSearchTerm}
                          onChange={(e) => setCrewSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-[#FCB283] focus:outline-none"
                        />
                      </div>

                      {/* Sort Controls */}
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${getClass('body')} text-white/60`}>
                          {currentContent.sortBy}:
                        </span>
                        <select
                          value={crewSortBy}
                          onChange={(e) => setCrewSortBy(e.target.value as 'name' | 'role' | 'age')}
                          className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white focus:border-[#FCB283] focus:outline-none text-sm"
                        >
                          <option value="name" className="bg-[#110D16]">{currentContent.name}</option>
                          <option value="role" className="bg-[#110D16]">{currentContent.role}</option>
                          <option value="age" className="bg-[#110D16]">{currentContent.age}</option>
                        </select>
                        <button
                          onClick={() => setCrewSortOrder(crewSortOrder === 'asc' ? 'desc' : 'asc')}
                          className="p-1 rounded hover:bg-white/10 transition-colors"
                        >
                          {crewSortOrder === 'asc' ? 
                            <ChevronUp className="w-4 h-4 text-white/60" /> : 
                            <ChevronDown className="w-4 h-4 text-white/60" />
                          }
                        </button>
                      </div>
                    </div>

                    {/* Crew Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full glass-card rounded-xl border border-white/10 min-w-[600px]">
                        <thead>
                          <tr className="bg-gradient-to-r from-[#AA4626] to-[#FCB283]">
                            <th className={`px-4 py-3 text-left ${getClass('subtitle')} text-white text-sm`}>
                              {currentContent.name}
                            </th>
                            <th className={`px-4 py-3 text-left ${getClass('subtitle')} text-white text-sm`}>
                              {currentContent.role}
                            </th>
                            <th className={`px-4 py-3 text-left ${getClass('subtitle')} text-white text-sm`}>
                              {currentContent.age}
                            </th>
                            <th className={`px-4 py-3 text-left ${getClass('subtitle')} text-white text-sm`}>
                              {currentContent.contact}
                            </th>
                            <th className={`px-4 py-3 text-left ${getClass('subtitle')} text-white text-sm`}>
                              {currentContent.institution}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCrew.map((member: any, index: number) => (
                            <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                              <td className={`px-4 py-3 ${getClass('body')} text-white/90 text-sm`}>
                                <div>
                                  <div className="font-medium">
                                    {currentLanguage === 'th' && member.fullNameTh 
                                      ? member.fullNameTh 
                                      : member.fullName}
                                  </div>
                                  {member.fullNameTh && (
                                    <div className="text-xs text-white/60">
                                      {currentLanguage === 'th' ? member.fullName : member.fullNameTh}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className={`px-4 py-3 ${getClass('body')} text-white/90 text-sm`}>
                                {member.role === 'Other' ? member.customRole : member.role}
                              </td>
                              <td className={`px-4 py-3 ${getClass('body')} text-white/90 text-sm`}>
                                {member.age} {currentLanguage === 'th' ? 'ปี' : 'years'}
                              </td>
                              <td className={`px-4 py-3 ${getClass('body')} text-white/90 text-sm`}>
                                <div className="space-y-1">
                                  {member.phone && (
                                    <div className="flex items-center space-x-2">
                                      <Phone className="w-3 h-3 text-white/60" />
                                      <span className="text-xs">{member.phone}</span>
                                      <button
                                        onClick={() => window.open(`tel:${member.phone}`)}
                                        className="p-1 rounded hover:bg-white/10 transition-colors"
                                      >
                                        <ExternalLink className="w-3 h-3 text-[#FCB283]" />
                                      </button>
                                    </div>
                                  )}
                                  {member.email && (
                                    <div className="flex items-center space-x-2">
                                      <Mail className="w-3 h-3 text-white/60" />
                                      <span className="text-xs break-all">{member.email}</span>
                                      <button
                                        onClick={() => window.open(`mailto:${member.email}`)}
                                        className="p-1 rounded hover:bg-white/10 transition-colors"
                                      >
                                        <ExternalLink className="w-3 h-3 text-[#FCB283]" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className={`px-4 py-3 ${getClass('body')} text-white/90 text-sm`}>
                                <div>
                                  {member.schoolName && (
                                    <div className="font-medium">{member.schoolName}</div>
                                  )}
                                  {member.studentId && (
                                    <div className="text-xs text-white/60 font-mono">ID: {member.studentId}</div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Show More/Less Button */}
                    {application.crewMembers.length > 5 && (
                      <div className="text-center">
                        <button
                          onClick={() => setShowAllCrew(!showAllCrew)}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                        >
                          {showAllCrew ? currentContent.showLess : currentContent.showAll}
                          {!showAllCrew && ` (${application.crewMembers.length - 5} more)`}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-white/40 mx-auto mb-4" />
                    <p className={`${getClass('body')} text-white/60`}>
                      {currentContent.noCrew}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 4. Proof Documents & Files Section */}
          <div className="glass-container rounded-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl ${getClass('header')} text-white flex items-center space-x-2`}>
                <FileText className="w-6 h-6 text-[#FCB283]" />
                <span>{currentContent.proofDocuments}</span>
              </h3>
              <button
                onClick={() => toggleSection('files')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {expandedSections.has('files') ? 
                  <ChevronUp className="w-5 h-5 text-white/60" /> : 
                  <ChevronDown className="w-5 h-5 text-white/60" />
                }
              </button>
            </div>

            {expandedSections.has('files') && (
              <div className="space-y-6">
                
                {/* Film File */}
                <div className="glass-card p-6 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Video className="w-6 h-6 text-[#FCB283]" />
                      <div>
                        <h4 className={`${getClass('subtitle')} text-white`}>
                          {currentContent.filmFile}
                        </h4>
                        <p className={`text-xs ${getClass('body')} text-white/60`}>
                          {application.files.filmFile.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getFileStatusIcon(application.files.filmFile)}
                      <span className={`text-sm ${getClass('body')} text-white/80`}>
                        {getFileStatusText(application.files.filmFile)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className={`text-xs ${getClass('body')} text-white/60`}>
                        {currentContent.fileSize}
                      </label>
                      <p className={`text-sm ${getClass('body')} text-white`}>
                        {formatFileSize(application.files.filmFile.size)}
                      </p>
                    </div>
                    <div>
                      <label className={`text-xs ${getClass('body')} text-white/60`}>
                        {currentContent.uploadDate}
                      </label>
                      <p className={`text-sm ${getClass('body')} text-white`}>
                        {formatDate(application.createdAt)}
                      </p>
                    </div>
                    <div>
                      <label className={`text-xs ${getClass('body')} text-white/60`}>
                        {currentContent.duration}
                      </label>
                      <p className={`text-sm ${getClass('body')} text-white`}>
                        {application.duration} {currentLanguage === 'th' ? 'นาที' : 'minutes'}
                      </p>
                    </div>
                  </div>

                  {application.files.filmFile.url && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFileDownload(application.files.filmFile.url, application.files.filmFile.name)}
                        className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span className="text-sm">{currentContent.download}</span>
                      </button>
                      <button
                        onClick={() => handleCopyLink(application.files.filmFile.url)}
                        className="flex items-center space-x-2 px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        <span className="text-sm">{currentContent.copyLink}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Poster File */}
                <div className="glass-card p-6 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Image className="w-6 h-6 text-[#FCB283]" />
                      <div>
                        <h4 className={`${getClass('subtitle')} text-white`}>
                          {currentContent.posterFile}
                        </h4>
                        <p className={`text-xs ${getClass('body')} text-white/60`}>
                          {application.files.posterFile.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getFileStatusIcon(application.files.posterFile)}
                      <span className={`text-sm ${getClass('body')} text-white/80`}>
                        {getFileStatusText(application.files.posterFile)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className={`text-xs ${getClass('body')} text-white/60`}>
                        {currentContent.fileSize}
                      </label>
                      <p className={`text-sm ${getClass('body')} text-white`}>
                        {formatFileSize(application.files.posterFile.size)}
                      </p>
                    </div>
                    <div>
                      <label className={`text-xs ${getClass('body')} text-white/60`}>
                        {currentContent.uploadDate}
                      </label>
                      <p className={`text-sm ${getClass('body')} text-white`}>
                        {formatDate(application.createdAt)}
                      </p>
                    </div>
                  </div>

                  {application.files.posterFile.url && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFileDownload(application.files.posterFile.url, application.files.posterFile.name)}
                        className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span className="text-sm">{currentContent.download}</span>
                      </button>
                      <button
                        onClick={() => setSelectedFilePreview(application.files.posterFile.url)}
                        className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="text-sm">{currentContent.preview}</span>
                      </button>
                      <button
                        onClick={() => handleCopyLink(application.files.posterFile.url)}
                        className="flex items-center space-x-2 px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        <span className="text-sm">{currentContent.copyLink}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Proof File */}
                {application.files.proofFile && (
                  <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-6 h-6 text-[#FCB283]" />
                        <div>
                          <h4 className={`${getClass('subtitle')} text-white`}>
                            {currentContent.proofFile}
                          </h4>
                          <p className={`text-xs ${getClass('body')} text-white/60`}>
                            {application.files.proofFile.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getFileStatusIcon(application.files.proofFile)}
                        <span className={`text-sm ${getClass('body')} text-white/80`}>
                          {getFileStatusText(application.files.proofFile)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className={`text-xs ${getClass('body')} text-white/60`}>
                          {currentContent.fileSize}
                        </label>
                        <p className={`text-sm ${getClass('body')} text-white`}>
                          {formatFileSize(application.files.proofFile.size)}
                        </p>
                      </div>
                      <div>
                        <label className={`text-xs ${getClass('body')} text-white/60`}>
                          {currentContent.uploadDate}
                        </label>
                        <p className={`text-sm ${getClass('body')} text-white`}>
                          {formatDate(application.createdAt)}
                        </p>
                      </div>
                    </div>

                    {application.files.proofFile.url && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleFileDownload(application.files.proofFile.url, application.files.proofFile.name)}
                          className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          <span className="text-sm">{currentContent.download}</span>
                        </button>
                        <button
                          onClick={() => handleCopyLink(application.files.proofFile.url)}
                          className="flex items-center space-x-2 px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                          <span className="text-sm">{currentContent.copyLink}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Application Timeline */}
          <div className="glass-container rounded-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl ${getClass('header')} text-white flex items-center space-x-2`}>
                <Clock className="w-6 h-6 text-[#FCB283]" />
                <span>{currentContent.applicationTimeline}</span>
              </h3>
              <button
                onClick={() => toggleSection('timeline')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {expandedSections.has('timeline') ? 
                  <ChevronUp className="w-5 h-5 text-white/60" /> : 
                  <ChevronDown className="w-5 h-5 text-white/60" />
                }
              </button>
            </div>

            {expandedSections.has('timeline') && (
              <div className="space-y-4">
                {/* Timeline Items */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 glass-card rounded-xl">
                    <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                    <div className="flex-1">
                      <h4 className={`${getClass('subtitle')} text-white`}>
                        {currentContent.draftCreated}
                      </h4>
                      <p className={`text-sm ${getClass('body')} text-white/60`}>
                        {formatDate(application.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 p-4 glass-card rounded-xl">
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="flex-1">
                      <h4 className={`${getClass('subtitle')} text-white`}>
                        {currentContent.lastModified}
                      </h4>
                      <p className={`text-sm ${getClass('body')} text-white/60`}>
                        {formatDate(application.lastModified)}
                      </p>
                    </div>
                  </div>

                  {application.submittedAt && (
                    <div className="flex items-center space-x-4 p-4 glass-card rounded-xl">
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      <div className="flex-1">
                        <h4 className={`${getClass('subtitle')} text-white`}>
                          {currentContent.submitted}
                        </h4>
                        <p className={`text-sm ${getClass('body')} text-white/60`}>
                          {formatDate(application.submittedAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  {application.lastReviewedAt && (
                    <div className="flex items-center space-x-4 p-4 glass-card rounded-xl">
                      <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                      <div className="flex-1">
                        <h4 className={`${getClass('subtitle')} text-white`}>
                          {currentContent.reviewed}
                        </h4>
                        <p className={`text-sm ${getClass('body')} text-white/60`}>
                          {formatDate(application.lastReviewedAt)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Video Section with Scoring Toggle */}
          <div className="relative">
            <VideoSection 
              application={application}
              isEditMode={false}
              canEdit={false}
            />
            
            {/* Scoring Panel Toggle */}
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setShowScoringPanel(!showScoringPanel)}
                className="flex items-center space-x-2 px-4 py-2 glass-container rounded-lg hover:bg-white/20 transition-colors"
              >
                <Star className="w-4 h-4 text-[#FCB283]" />
                <span className={`text-sm ${getClass('body')} text-white`}>
                  {showScoringPanel ? currentContent.hideScoring : currentContent.toggleScoring}
                </span>
              </button>
            </div>
          </div>

          {/* Scoring Panel */}
          {showScoringPanel && (
            <VideoScoringPanel
              applicationId={application.id}
              currentScores={currentScores}
              allScores={application.scores}
              onScoreChange={handleScoreChange}
              onSaveScores={handleSaveScores}
              isSubmitting={isSubmittingScore}
            />
          )}
        </div>

        {/* Right Column: Admin Controls */}
        <div className="xl:col-span-1">
          <AdminControlsPanel
            application={application}
            onStatusChange={handleStatusChange}
            onNotesChange={handleNotesChange}
            onFlagToggle={handleFlagToggle}
            onExport={handleExport}
            onPrint={handlePrint}
            isUpdating={isUpdatingStatus}
          />
        </div>
      </div>

      {/* File Preview Modal */}
      {selectedFilePreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-4xl max-h-[90vh] w-full">
            <div className="glass-container rounded-2xl p-6 relative">
              <button
                onClick={() => setSelectedFilePreview(null)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <XCircle className="w-6 h-6 text-white/80" />
              </button>
              <img
                src={selectedFilePreview}
                alt="File Preview"
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApplicationDetailPage;