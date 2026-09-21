import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type AppView = 'auth' | 'dashboard' | 'adminDashboard' | 'create' | 'profile' | 'settings' | 'myLessonPlans' | 'recentLessons' | 'categories' | 'search';

// TODO: replace with your computer's local IP (e.g. http://192.168.1.5:5000) when testing on a phone/emulator.
// 'localhost' only works when running the app in a web browser on the same machine as the server.
const API_URL = 'http://localhost:5000';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000; // 1 minute

const subjects = ['Mathematics', 'Science', 'English', 'Filipino', 'Araling Panlipunan', 'Computer Programming', 'Physical Education'];
const grades = ['Grade 1-3', 'Grade 4-6', 'Grade 7-9', 'Grade 10-12'];
const colors = { ink: '#173B36', paper: '#FCFAF5', accent: '#E07A5F', pale: '#E7F0E6', muted: '#788580', line: '#DCE4DC' };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 90 }, (_, i) => String(CURRENT_YEAR - 15 - i));

function daysInMonth(monthIndex: number, year: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function calculateAge(month: string, day: string, year: string): number | null {
  if (!month || !day || !year) return null;
  const monthIndex = MONTHS.indexOf(month);
  const birth = new Date(Number(year), monthIndex, Number(day));
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear = today.getMonth() > monthIndex || (today.getMonth() === monthIndex && today.getDate() >= Number(day));
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: colors.line };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score, label: 'Weak', color: '#D64545' };
  if (score <= 3) return { score, label: 'Good', color: '#E0A458' };
  return { score, label: 'Strong', color: '#3E9C5A' };
}

function generateUsernameSuggestions(firstname: string, lastname: string): string[] {
  const f = firstname.trim().toLowerCase().replace(/[^a-z]/g, '');
  const l = lastname.trim().toLowerCase().replace(/[^a-z]/g, '');
  if (!f || !l) return [];
  const num2 = Math.floor(10 + Math.random() * 90);
  const num3 = Math.floor(100 + Math.random() * 900);
  const raw = [`${f}${l}${num2}`, `${l}${f}${num3}`, `${f}.${l}`, `${f}_${l}${num2}`, `${f[0]}${l}${num3}`];
  return Array.from(new Set(raw));
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

type CurrentUser = { firstname: string; lastname: string; email: string; username: string; role: string; school?: string; subjectsTaught?: string; profilePictureUrl?: string };
type Lesson = { _id: string; subject: string; grade: string; topic: string; objectives: string; username: string; createdAt: string; updatedAt: string };

type AuthProps = {
  isRegistering: boolean;
  setIsRegistering: (value: boolean) => void;
  onSubmit: () => void;
  firstname: string;
  lastname: string;
  email: string;
  birthMonth: string;
  birthDay: string;
  birthYear: string;
  age: number | null;
  username: string;
  password: string;
  confirmPassword: string;
  school: string;
  subjectsTaught: string;
  profilePictureUrl: string;
  agreedToTerms: boolean;
  usernameStatus: 'idle' | 'checking' | 'available' | 'taken';
  setFirstname: (value: string) => void;
  setLastname: (value: string) => void;
  setEmail: (value: string) => void;
  setBirthMonth: (value: string) => void;
  setBirthDay: (value: string) => void;
  setBirthYear: (value: string) => void;
  setUsername: (value: string) => void;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  setSchool: (value: string) => void;
  setSubjectsTaught: (value: string) => void;
  setProfilePictureUrl: (value: string) => void;
  setAgreedToTerms: (value: boolean) => void;
  checkUsername: () => void;
  isSubmitting: boolean;
  errorMessage: string;
  lockSecondsLeft: number;
  isSuccessVisible: boolean;
  onContinueFromSuccess: () => void;
};
type FormProps = { subject: string; grade: string; topic: string; objectives: string; setSubject: (value: string) => void; setGrade: (value: string) => void; setTopic: (value: string) => void; setObjectives: (value: string) => void; onBack: () => void; onSave: () => void; isSaving: boolean };

export default function HomeScreen() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [view, setView] = useState<AppView>('auth');
  const [isRegistering, setIsRegistering] = useState(false);
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [topic, setTopic] = useState('');
  const [objectives, setObjectives] = useState('');
  const [isSavingLesson, setIsSavingLesson] = useState(false);

  // Registration + account fields
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [school, setSchool] = useState('');
  const [subjectsTaught, setSubjectsTaught] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const age = useMemo(() => calculateAge(birthMonth, birthDay, birthYear), [birthMonth, birthDay, birthYear]);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setIsSplashVisible(false), 1100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!lockUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockUntil(null);
        setLockSecondsLeft(0);
        setFailedAttempts(0);
        setErrorMessage('');
      } else {
        setLockSecondsLeft(remaining);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [lockUntil]);

  async function fetchLessons(forUsername: string) {
    try {
      const response = await fetch(`${API_URL}/api/lessons?username=${encodeURIComponent(forUsername)}`);
      const data = await response.json();
      setLessons(Array.isArray(data) ? data : []);
    } catch {
      // Silently ignore — the dashboard will just show an empty state.
    }
  }

  useEffect(() => {
    if (currentUser?.username) fetchLessons(currentUser.username);
  }, [currentUser?.username]);

  async function checkUsername() {
    if (!username) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    try {
      const response = await fetch(`${API_URL}/api/check-username/${encodeURIComponent(username)}`);
      const data = await response.json();
      setUsernameStatus(data.available ? 'available' : 'taken');
    } catch {
      setUsernameStatus('idle');
    }
  }

  function resetAuthFields() {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setFirstname('');
    setLastname('');
    setEmail('');
    setBirthMonth('');
    setBirthDay('');
    setBirthYear('');
    setSchool('');
    setSubjectsTaught('');
    setProfilePictureUrl('');
    setAgreedToTerms(false);
    setUsernameStatus('idle');
    setErrorMessage('');
  }

  function goToDashboardFor(user: CurrentUser) {
    setIsSuccessVisible(false);
    setView(user.role === 'admin' ? 'adminDashboard' : 'dashboard');
  }

  async function handleAuthSubmit() {
    if (lockUntil && Date.now() < lockUntil) {
      setErrorMessage(`Too many failed attempts. Try again in ${lockSecondsLeft}s.`);
      return;
    }

    if (isRegistering) {
      if (!firstname || !lastname || !email || !birthMonth || !birthDay || !birthYear || !username || !password || !confirmPassword) {
        setErrorMessage('Please fill in every required field before creating an account.');
        return;
      }
      if (usernameStatus === 'taken') {
        setErrorMessage('That username is already taken. Please choose another.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please check and try again.');
        return;
      }
      if (!agreedToTerms) {
        setErrorMessage('Please agree to the Terms and Conditions to continue.');
        return;
      }

      setIsSubmitting(true);
      setErrorMessage('');
      const birthdate = `${birthYear}-${String(MONTHS.indexOf(birthMonth) + 1).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

      try {
        const response = await fetch(`${API_URL}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstname, lastname, email, age, birthdate, username, password, role: 'teacher', school, subjectsTaught, profilePictureUrl }),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody.error || 'Failed to create your account.');
        }

        const savedUser = await response.json();
        const newUser: CurrentUser = { firstname: savedUser.firstname, lastname: savedUser.lastname, email: savedUser.email, username: savedUser.username, role: savedUser.role, school: savedUser.school, subjectsTaught: savedUser.subjectsTaught, profilePictureUrl: savedUser.profilePictureUrl };
        setCurrentUser(newUser);
        resetAuthFields();
        setIsRegistering(false);
        setIsSuccessVisible(true);
        setTimeout(() => goToDashboardFor(newUser), 1400);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Check your connection and try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!username || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const nextAttempts = failedAttempts + 1;
        if (nextAttempts >= MAX_ATTEMPTS) {
          setLockUntil(Date.now() + LOCKOUT_MS);
          setLockSecondsLeft(LOCKOUT_MS / 1000);
          setErrorMessage('Too many failed attempts. Locked for 1 minute.');
        } else {
          setFailedAttempts(nextAttempts);
          setErrorMessage(`${errorBody.error || 'Invalid username or password.'} (${MAX_ATTEMPTS - nextAttempts} attempt${MAX_ATTEMPTS - nextAttempts === 1 ? '' : 's'} left)`);
        }
        return;
      }

      const data = await response.json();
      setFailedAttempts(0);
      setPassword('');
      const user: CurrentUser = { firstname: data.firstname, lastname: data.lastname, email: data.email, username: data.username, role: data.role, school: data.school, subjectsTaught: data.subjectsTaught, profilePictureUrl: data.profilePictureUrl };
      setCurrentUser(user);
      setView(user.role === 'admin' ? 'adminDashboard' : 'dashboard');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveLesson() {
    if (!currentUser || !subject || !grade || !topic) return;
    setIsSavingLesson(true);
    try {
      const response = await fetch(`${API_URL}/api/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, grade, topic, objectives, username: currentUser.username }),
      });
      if (response.ok) {
        setSubject(''); setGrade(''); setTopic(''); setObjectives('');
        await fetchLessons(currentUser.username);
      }
    } catch {
      // Keep it simple — the form stays open so the person can retry.
    } finally {
      setIsSavingLesson(false);
      setView('dashboard');
    }
  }

  function handleSignOut() {
    setCurrentUser(null);
    setLessons([]);
    setView('auth');
  }

  if (isSplashVisible) return <View style={styles.splash}><View style={styles.logoMark}><Ionicons name="sparkles" size={28} color={colors.ink} />
  </View><Text style={styles.splashTitle}>LessonPlanner</Text><Text style={styles.splashCaption}>Plan with purpose.</Text></View>;

  if (view === 'auth') return <AuthScreen
    isRegistering={isRegistering}
    setIsRegistering={setIsRegistering}
    onSubmit={handleAuthSubmit}
    firstname={firstname} lastname={lastname} email={email}
    birthMonth={birthMonth} birthDay={birthDay} birthYear={birthYear} age={age}
    username={username} password={password} confirmPassword={confirmPassword}
    school={school} subjectsTaught={subjectsTaught} profilePictureUrl={profilePictureUrl}
    agreedToTerms={agreedToTerms} usernameStatus={usernameStatus}
    setFirstname={setFirstname} setLastname={setLastname} setEmail={setEmail}
    setBirthMonth={setBirthMonth} setBirthDay={setBirthDay} setBirthYear={setBirthYear}
    setUsername={setUsername} setPassword={setPassword} setConfirmPassword={setConfirmPassword}
    setSchool={setSchool} setSubjectsTaught={setSubjectsTaught} setProfilePictureUrl={setProfilePictureUrl}
    setAgreedToTerms={setAgreedToTerms} checkUsername={checkUsername}
    isSubmitting={isSubmitting} errorMessage={errorMessage} lockSecondsLeft={lockSecondsLeft}
    isSuccessVisible={isSuccessVisible}
    onContinueFromSuccess={() => currentUser && goToDashboardFor(currentUser)}
  />;

  if (view === 'create') return <LessonForm subject={subject} grade={grade} topic={topic} objectives={objectives} setSubject={setSubject} setGrade={setGrade} setTopic={setTopic} setObjectives={setObjectives} onBack={() => setView('dashboard')} onSave={handleSaveLesson} isSaving={isSavingLesson} />;

  if (view === 'adminDashboard') return <AdminDashboard currentUser={currentUser} onSignOut={handleSignOut} />;

  if (view === 'profile') return <ProfileScreen currentUser={currentUser} setCurrentUser={setCurrentUser} onBack={() => setView('dashboard')} />;

  if (view === 'settings') return <SettingsScreen currentUser={currentUser} onBack={() => setView('dashboard')} onSignOut={handleSignOut} />;

  if (view === 'myLessonPlans') return <LessonListScreen title="My Lesson Plans" lessons={lessons} onBack={() => setView('dashboard')} />;

  if (view === 'recentLessons') return <LessonListScreen title="Recent Lessons" lessons={[...lessons].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 10)} onBack={() => setView('dashboard')} />;

  if (view === 'categories') return <CategoriesScreen lessons={lessons} onBack={() => setView('dashboard')} />;

  if (view === 'search') return <SearchScreen lessons={lessons} query={searchQuery} setQuery={setSearchQuery} onBack={() => setView('dashboard')} />;

  return <Dashboard currentUser={currentUser} lessons={lessons} onCreate={() => setView('create')} onSignOut={handleSignOut} onNavigate={setView} />;
}

function Brand() {
  return <View style={styles.authBrand}><View style={styles.smallLogo}>
    <Ionicons name="sparkles" size={18} color={colors.ink} /></View><Text style={styles.brandName}>LessonPlanner</Text></View>;
}
function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) { return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>{label}</Text><TextInput style={styles.input} placeholderTextColor={colors.muted} {...props} /></View>; }

function PasswordField({ label, placeholder, value, onChangeText, editable = true }: { label: string; placeholder: string; value: string; onChangeText: (value: string) => void; editable?: boolean }) {
  const [isVisible, setIsVisible] = useState(false);

  return <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.passwordInputWrap}>
      <TextInput
        style={[styles.input, styles.passwordInput]}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={!isVisible}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
      />
      <Pressable style={styles.passwordEye} onPress={() => setIsVisible((visible) => !visible)} hitSlop={10}>
        <Ionicons name={isVisible ? 'eye-off-outline' : 'eye-outline'} size={21} color={colors.muted} />
      </Pressable>
    </View>
  </View>;
}

function PickerField({ label, value, placeholder, options, onSelect }: { label: string; value: string; placeholder: string; options: string[]; onSelect: (value: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  return <View style={styles.pickerFieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Pressable style={styles.input} onPress={() => setIsOpen(true)}>
      <Text style={value ? styles.pickerValueText : styles.pickerPlaceholderText}>{value || placeholder}</Text>
    </Pressable>
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setIsOpen(false)}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{label}</Text>
          <ScrollView style={styles.modalList}>
            {options.map((option) => (
              <Pressable key={option} style={styles.modalOption} onPress={() => { onSelect(option); setIsOpen(false); }}>
                <Text style={[styles.modalOptionText, option === value && styles.modalOptionTextSelected]}>{option}</Text>
                {option === value && <Ionicons name="checkmark" size={18} color={colors.ink} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  </View>;
}

function AnimatedCheckmark() {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    scale.setValue(0);
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={[styles.successCircle, { transform: [{ scale }] }]}>
    <Ionicons name="checkmark" size={36} color={colors.paper} />
  </Animated.View>;
}

function Avatar({ uri, name, size = 44 }: { uri?: string; name: string; size?: number }) {
  return <View style={[styles.avatarBase, { width: size, height: size, borderRadius: size / 2 }]}>
    {uri ? <Text style={{ display: 'none' }} /> : null}
    <Text style={[styles.avatarInitial, { fontSize: size * 0.4 }]}>{name?.[0]?.toUpperCase() || '?'}</Text>
  </View>;
}

// SIGN IN / REGISTER PAGE --------

function AuthScreen({ isRegistering, setIsRegistering, onSubmit, firstname, lastname, email, birthMonth, birthDay, birthYear, age, username, password, confirmPassword, school, subjectsTaught, profilePictureUrl, agreedToTerms, usernameStatus, setFirstname, setLastname, setEmail, setBirthMonth, setBirthDay, setBirthYear, setUsername, setPassword, setConfirmPassword, setSchool, setSubjectsTaught, setProfilePictureUrl, setAgreedToTerms, checkUsername, isSubmitting, errorMessage, lockSecondsLeft, isSuccessVisible, onContinueFromSuccess }: AuthProps) {
  const isLocked = lockSecondsLeft > 0;
  const [isTermsVisible, setIsTermsVisible] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const [stepError, setStepError] = useState('');
  const dayOptions = useMemo(() => {
    const monthIndex = MONTHS.indexOf(birthMonth);
    const total = monthIndex >= 0 && birthYear ? daysInMonth(monthIndex, Number(birthYear)) : 31;
    return Array.from({ length: total }, (_, i) => String(i + 1));
  }, [birthMonth, birthYear]);
  const strength = getPasswordStrength(password);
  const usernameSuggestions = useMemo(() => generateUsernameSuggestions(firstname, lastname), [firstname, lastname]);

  function handleStepContinue() {
    setStepError('');
    if (registerStep === 1) {
      if (!firstname || !lastname || !email || !birthMonth || !birthDay || !birthYear) {
        setStepError('Please complete your personal details before continuing.');
        return;
      }
      setRegisterStep(2);
      return;
    }
    if (registerStep === 2) {
      if (!username || !password || !confirmPassword) {
        setStepError('Please complete your account details before continuing.');
        return;
      }
      if (password !== confirmPassword) {
        setStepError('Passwords do not match. Please check and try again.');
        return;
      }
      setRegisterStep(3);
      return;
    }
    onSubmit();
  }

  function handleAuthModeChange() {
    setRegisterStep(1);
    setStepError('');
    setIsRegistering(!isRegistering);
  }

  return <SafeAreaView style={styles.safeArea}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}><ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
    <Brand /><View style={styles.authIntro}><Text style={styles.eyebrow}>YOUR CLASSROOM, CLEARER</Text><Text style={styles.heading}>{isRegistering ? registerStep === 1 ? 'Tell us about you.' : registerStep === 2 ? 'Secure your account.' : 'Make it yours.' : 'Make every lesson count.'}</Text><Text style={styles.mutedText}>{isRegistering ? registerStep === 1 ? 'Start with a few personal details.' : registerStep === 2 ? 'Choose how you will sign in.' : 'Add a little more about your teaching.' : 'A calm space for thoughtful teaching and better preparation.'}</Text></View>
    {isRegistering && <>
      <View style={styles.registerProgress}>{[1, 2, 3].map((step) => <View key={step} style={[styles.registerProgressSegment, step <= registerStep && styles.registerProgressSegmentActive]} />)}</View>
      <Text style={styles.registerStepLabel}>STEP {registerStep} OF 3</Text>
      {registerStep === 1 && <>
        <Field label="First name" placeholder="Alex" value={firstname} onChangeText={setFirstname} />
        <Field label="Last name" placeholder="Morgan" value={lastname} onChangeText={setLastname} />
        <Field label="Email address" placeholder="you@school.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <Text style={styles.fieldLabel}>Birthdate</Text>
        <View style={styles.birthdateRow}>
          <PickerField label="Month" value={birthMonth} placeholder="Month" options={MONTHS} onSelect={setBirthMonth} />
          <PickerField label="Day" value={birthDay} placeholder="Day" options={dayOptions} onSelect={setBirthDay} />
          <PickerField label="Year" value={birthYear} placeholder="Year" options={YEARS} onSelect={setBirthYear} />
        </View>
        <View style={styles.ageDisplay}><Text style={styles.ageDisplayLabel}>Age</Text><Text style={styles.ageDisplayValue}>{age !== null ? `${age} years old` : '—'}</Text></View>
      </>}
    </>}
    {(!isRegistering || registerStep === 2) && <>
      <Field label="Username" placeholder="alexmorgan" autoCapitalize="none" value={username} onChangeText={setUsername} onBlur={isRegistering ? checkUsername : undefined} />
      {isRegistering && usernameSuggestions.length > 0 && (
        <View style={styles.suggestionWrap}>
          <Text style={styles.suggestionLabel}>Suggestions:</Text>
          <View style={styles.suggestionChipWrap}>
            {usernameSuggestions.map((s) => (
              <Pressable key={s} style={styles.suggestionChip} onPress={() => { setUsername(s); checkUsername(); }}>
                <Text style={styles.suggestionChipText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {isRegistering && !!username && (
        <Text style={[styles.usernameHint, usernameStatus === 'taken' && styles.usernameHintTaken, usernameStatus === 'available' && styles.usernameHintAvailable]}>
          {usernameStatus === 'checking' && 'Checking availability…'}
          {usernameStatus === 'available' && 'Username is available.'}
          {usernameStatus === 'taken' && 'That username is already taken.'}
        </Text>
      )}
      <PasswordField label="Password" placeholder="At least 8 characters" value={password} onChangeText={setPassword} editable={!isLocked} />
      {isRegistering && !!password && (
        <View style={styles.strengthWrap}>
          <View style={styles.strengthTrack}><View style={[styles.strengthFill, { width: `${(strength.score / 4) * 100}%`, backgroundColor: strength.color }]} /></View>
          <View style={styles.strengthLabelRow}><View style={[styles.strengthDot, { backgroundColor: strength.color }]} /><Text style={[styles.strengthLabelText, { color: strength.color }]}>{strength.label}</Text></View>
        </View>
      )}
      {isRegistering && <>
        <PasswordField label="Confirm Password" placeholder="Re-enter your password" value={confirmPassword} onChangeText={setConfirmPassword} />
        {!!confirmPassword && (
          <Text style={[styles.usernameHint, password === confirmPassword ? styles.usernameHintAvailable : styles.usernameHintTaken]}>
            {password === confirmPassword ? 'Passwords match.' : 'Passwords do not match.'}
          </Text>
        )}
      </>}
    </>}
    {isRegistering && registerStep === 3 && <>
      <Text style={styles.formSectionTitle}>Optional — educational info</Text>
      <Field label="School / Institution" placeholder="e.g. Rizal Elementary School" value={school} onChangeText={setSchool} />
      <Field label="Subject(s) you teach" placeholder="e.g. Math, Science" value={subjectsTaught} onChangeText={setSubjectsTaught} />
      <Field label="Profile picture URL" placeholder="Paste a link to your photo" autoCapitalize="none" value={profilePictureUrl} onChangeText={setProfilePictureUrl} />
      <Pressable style={styles.termsRow} onPress={() => setAgreedToTerms(!agreedToTerms)}>
        <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>{agreedToTerms && <Ionicons name="checkmark" size={14} color={colors.paper} />}</View>
        <Text style={styles.termsText}>I agree to the <Text style={styles.termsLink} onPress={() => setIsTermsVisible(true)}>Terms and Conditions</Text></Text>
      </Pressable>
      <Modal visible={isTermsVisible} transparent animationType="fade" onRequestClose={() => setIsTermsVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsTermsVisible(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Terms and Conditions</Text>
            <ScrollView style={styles.modalList}>
              <Text style={styles.termsBody}>
                By creating an account with SmartLessonPlanner, you agree to use this app responsibly for creating and organizing lesson plans. Your account information is stored securely and only used to personalize your experience. Please keep your password private. This app is provided as-is for educational purposes.
              </Text>
            </ScrollView>
            <Pressable style={styles.primaryButton} onPress={() => setIsTermsVisible(false)}><Text style={styles.primaryButtonText}>Close</Text></Pressable>
          </View>
        </Pressable>
      </Modal>
    </>}
    {!!stepError && <Text style={styles.errorText}>{stepError}</Text>}
    {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
    <Pressable style={[styles.primaryButton, (isSubmitting || isLocked) && styles.disabledButton]} disabled={isSubmitting || isLocked} onPress={isRegistering ? handleStepContinue : onSubmit}>
      <Text style={styles.primaryButtonText}>{isLocked ? `Locked (${lockSecondsLeft}s)` : isSubmitting ? 'Please wait…' : isRegistering ? registerStep === 3 ? 'Create account' : 'Continue' : 'Sign in'}</Text>
      {!isLocked && <Ionicons name="arrow-forward" size={18} color={colors.paper} />}
    </Pressable>
    <Pressable style={styles.switchAuth} onPress={handleAuthModeChange}><Text style={styles.switchText}>{isRegistering ? 'Already have an account? ' : 'New to LessonPlanner? '}<Text style={styles.switchAction}>{isRegistering ? 'Sign in' : 'Register'}</Text></Text></Pressable>
    <Modal visible={isSuccessVisible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.successCard}>
          <AnimatedCheckmark />
          <Text style={styles.successTitle}>Account created</Text>
          <Text style={styles.successSubtitle}>Taking you to your dashboard…</Text>
          <Pressable style={styles.primaryButton} onPress={onContinueFromSuccess}><Text style={styles.primaryButtonText}>Continue now</Text></Pressable>
        </View>
      </View>
    </Modal>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

// DASHBOARD --------

const QUICK_LINKS: Array<{ key: AppView; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'myLessonPlans', label: 'My Lesson Plans', icon: 'folder-outline' },
  { key: 'recentLessons', label: 'Recent Lessons', icon: 'time-outline' },
  { key: 'search', label: 'Search', icon: 'search-outline' },
  { key: 'profile', label: 'Profile', icon: 'person-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

function Dashboard({ currentUser, lessons, onCreate, onSignOut, onNavigate }: { currentUser: CurrentUser | null; lessons: Lesson[]; onCreate: () => void; onSignOut: () => void; onNavigate: (view: AppView) => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const recent = [...lessons].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3);
  return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.pageContent}>
    <View style={styles.topBar}><Brand />
      <Pressable onPress={() => setIsMenuOpen(true)} hitSlop={12}><Ionicons name="menu" size={26} color={colors.ink} /></Pressable>
    </View>
    <Text style={styles.eyebrow}>TEACHER DASHBOARD</Text><Text style={styles.dashboardHeading}>Good morning, {currentUser?.firstname || 'there'}.</Text><Text style={styles.mutedText}>What will you make space for today?</Text>
    <Pressable style={styles.createCard} onPress={onCreate}><View><Text style={styles.createKicker}>START FROM SCRATCH</Text><Text style={styles.createTitle}>Create a lesson plan</Text><Text style={styles.createDescription}>Turn an idea into a focused classroom experience.</Text></View><View style={styles.arrowCircle}><Ionicons name="arrow-forward" size={20} color={colors.ink} /></View></Pressable>

    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recently worked on</Text><Text style={styles.countText}>{lessons.length} total</Text></View>
    {recent.length === 0 ? (
      <View style={styles.emptyState}><Ionicons name="documents-outline" size={32} color={colors.accent} /><Text style={styles.emptyTitle}>Your lesson plans will live here.</Text><Text style={styles.emptyDescription}>Create your first plan and keep your best thinking close.</Text></View>
    ) : recent.map((lesson) => <LessonCard key={lesson._id} lesson={lesson} />)}
  </ScrollView>
    <SideMenu visible={isMenuOpen} onClose={() => setIsMenuOpen(false)} currentUser={currentUser} onNavigate={onNavigate} onSignOut={onSignOut} />
  </SafeAreaView>;
}

function MenuItem({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return <Pressable style={styles.menuItem} onPress={onPress}>
    <Ionicons name={icon} size={20} color={danger ? '#B3261E' : colors.ink} />
    <Text style={[styles.menuItemText, danger && { color: '#B3261E' }]}>{label}</Text>
  </Pressable>;
}

function SideMenu({ visible, onClose, currentUser, onNavigate, onSignOut }: { visible: boolean; onClose: () => void; currentUser: CurrentUser | null; onNavigate: (v: AppView) => void; onSignOut: () => void }) {
  const translateX = useRef(new Animated.Value(280)).current;
  useEffect(() => {
    if (visible) {
      translateX.setValue(280);
      Animated.timing(translateX, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={styles.sideMenuBackdrop} onPress={onClose}>
      <Pressable onPress={() => { }}>
        <Animated.View style={[styles.sideMenuPanel, { transform: [{ translateX }] }]}>
          <View style={styles.sideMenuHeader}>
            <Avatar uri={currentUser?.profilePictureUrl} name={currentUser?.firstname || '?'} size={60} />
            <Text style={styles.sideMenuName}>{currentUser?.firstname} {currentUser?.lastname}</Text>
            <Text style={styles.mutedText}>@{currentUser?.username}</Text>
          </View>
          <MenuItem icon="person-outline" label="Profile" onPress={() => { onClose(); onNavigate('profile'); }} />
          <MenuItem icon="folder-outline" label="My Lesson Plans" onPress={() => { onClose(); onNavigate('myLessonPlans'); }} />
          <MenuItem icon="grid-outline" label="Categories" onPress={() => { onClose(); onNavigate('categories'); }} />
          <MenuItem icon="settings-outline" label="Settings" onPress={() => { onClose(); onNavigate('settings'); }} />
          <View style={{ flex: 1 }} />
          <MenuItem icon="log-out-outline" label="Sign out" onPress={() => { onClose(); onSignOut(); }} danger />
        </Animated.View>
      </Pressable>
    </Pressable>
  </Modal>;
}

function LessonCard({ lesson }: { lesson: Lesson }) {
  return <View style={styles.lessonCard}>
    <View style={styles.lessonCardTop}><Text style={styles.lessonSubjectTag}>{lesson.subject}</Text><Text style={styles.lessonDate}>{formatDate(lesson.updatedAt)}</Text></View>
    <Text style={styles.lessonTopic}>{lesson.topic}</Text>
    <Text style={styles.lessonMeta}>{lesson.grade}</Text>
  </View>;
}

function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <View style={styles.topBar}><Pressable onPress={onBack} hitSlop={12}><Ionicons name="arrow-back" size={23} color={colors.ink} /></Pressable><Text style={styles.formTopTitle}>{title}</Text><View style={{ width: 23 }} /></View>;
}

function LessonListScreen({ title, lessons, onBack }: { title: string; lessons: Lesson[]; onBack: () => void }) {
  return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.pageContent}>
    <ScreenHeader title={title} onBack={onBack} />
    {lessons.length === 0 ? (
      <View style={styles.emptyState}><Ionicons name="documents-outline" size={32} color={colors.accent} /><Text style={styles.emptyTitle}>Nothing here yet.</Text></View>
    ) : lessons.map((lesson) => <LessonCard key={lesson._id} lesson={lesson} />)}
  </ScrollView></SafeAreaView>;
}

function CategoriesScreen({ lessons, onBack }: { lessons: Lesson[]; onBack: () => void }) {
  const grouped = useMemo(() => {
    const map: Record<string, Lesson[]> = {};
    lessons.forEach((l) => { (map[l.subject] ||= []).push(l); });
    return Object.entries(map);
  }, [lessons]);
  return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.pageContent}>
    <ScreenHeader title="Categories" onBack={onBack} />
    {grouped.length === 0 ? (
      <View style={styles.emptyState}><Ionicons name="grid-outline" size={32} color={colors.accent} /><Text style={styles.emptyTitle}>No lesson plans to categorize yet.</Text></View>
    ) : grouped.map(([subjectName, items]) => (
      <View key={subjectName} style={{ marginBottom: 24 }}>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{subjectName}</Text><Text style={styles.countText}>{items.length}</Text></View>
        {items.map((lesson) => <LessonCard key={lesson._id} lesson={lesson} />)}
      </View>
    ))}
  </ScrollView></SafeAreaView>;
}

function SearchScreen({ lessons, query, setQuery, onBack }: { lessons: Lesson[]; query: string; setQuery: (v: string) => void; onBack: () => void }) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return lessons.filter((l) => l.topic.toLowerCase().includes(q) || l.subject.toLowerCase().includes(q) || l.grade.toLowerCase().includes(q));
  }, [lessons, query]);
  return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.pageContent}>
    <ScreenHeader title="Search" onBack={onBack} />
    <Field label="Search your lesson plans" placeholder="Try a topic, subject, or grade" value={query} onChangeText={setQuery} autoFocus />
    {query.trim() !== '' && filtered.length === 0 && <Text style={styles.mutedText}>No matches found.</Text>}
    {filtered.map((lesson) => <LessonCard key={lesson._id} lesson={lesson} />)}
  </ScrollView></SafeAreaView>;
}

function ProfileScreen({ currentUser, setCurrentUser, onBack }: { currentUser: CurrentUser | null; setCurrentUser: (u: CurrentUser | null) => void; onBack: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState(currentUser?.email || '');
  const [school, setSchool] = useState(currentUser?.school || '');
  const [subjectsTaught, setSubjectsTaught] = useState(currentUser?.subjectsTaught || '');
  const [profilePictureUrl, setProfilePictureUrl] = useState(currentUser?.profilePictureUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function handleSave() {
    if (!currentUser) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const response = await fetch(`${API_URL}/api/users/${encodeURIComponent(currentUser.username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, school, subjectsTaught, profilePictureUrl }),
      });
      if (!response.ok) throw new Error('Could not save your profile.');
      const updated = await response.json();
      setCurrentUser({ ...currentUser, email: updated.email, school: updated.school, subjectsTaught: updated.subjectsTaught, profilePictureUrl: updated.profilePictureUrl });
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  }

  return <SafeAreaView style={styles.safeArea}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}><ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
    <ScreenHeader title="Profile" onBack={onBack} />
    <View style={{ alignItems: 'center', marginBottom: 28 }}>
      <Avatar uri={currentUser?.profilePictureUrl} name={currentUser?.firstname || '?'} size={84} />
      <Text style={[styles.dashboardHeading, { fontSize: 22, marginTop: 14, marginBottom: 2 }]}>{currentUser?.firstname} {currentUser?.lastname}</Text>
      <Text style={styles.mutedText}>@{currentUser?.username}</Text>
    </View>

    {!isEditing ? (
      <>
        <ProfileRow label="Email" value={currentUser?.email || '—'} />
        <ProfileRow label="School / Institution" value={currentUser?.school || 'Not set'} />
        <ProfileRow label="Subject(s) taught" value={currentUser?.subjectsTaught || 'Not set'} />
        <Pressable style={[styles.primaryButton, { marginTop: 20 }]} onPress={() => setIsEditing(true)}><Text style={styles.primaryButtonText}>Edit Profile</Text></Pressable>
      </>
    ) : (
      <>
        <Field label="Email address" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <Field label="School / Institution" value={school} onChangeText={setSchool} />
        <Field label="Subject(s) you teach" value={subjectsTaught} onChangeText={setSubjectsTaught} />
        <Field label="Profile picture URL" autoCapitalize="none" value={profilePictureUrl} onChangeText={setProfilePictureUrl} />
        {!!saveError && <Text style={styles.errorText}>{saveError}</Text>}
        <Pressable style={[styles.primaryButton, isSaving && styles.disabledButton]} disabled={isSaving} onPress={handleSave}><Text style={styles.primaryButtonText}>{isSaving ? 'Saving…' : 'Save changes'}</Text></Pressable>
        <Pressable style={styles.switchAuth} onPress={() => setIsEditing(false)}><Text style={styles.switchText}>Cancel</Text></Pressable>
      </>
    )}
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.profileRow}><Text style={styles.profileRowLabel}>{label}</Text><Text style={styles.profileRowValue}>{value}</Text></View>;
}

function SettingsScreen({ currentUser, onBack, onSignOut }: { currentUser: CurrentUser | null; onBack: () => void; onSignOut: () => void }) {
  return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.pageContent}>
    <ScreenHeader title="Settings" onBack={onBack} />
    <View style={styles.settingsRow}><Ionicons name="person-circle-outline" size={22} color={colors.ink} /><Text style={styles.settingsRowText}>Signed in as @{currentUser?.username}</Text></View>
    <View style={styles.settingsRow}><Ionicons name="notifications-outline" size={22} color={colors.ink} /><Text style={styles.settingsRowText}>Notifications</Text></View>
    <View style={styles.settingsRow}><Ionicons name="lock-closed-outline" size={22} color={colors.ink} /><Text style={styles.settingsRowText}>Privacy & Security</Text></View>
    <View style={styles.settingsRow}><Ionicons name="information-circle-outline" size={22} color={colors.ink} /><Text style={styles.settingsRowText}>About SmartLessonPlanner</Text></View>
    <Pressable style={[styles.primaryButton, { marginTop: 24, backgroundColor: '#B3261E' }]} onPress={onSignOut}><Text style={styles.primaryButtonText}>Sign out</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

// ADMIN DASHBOARD --------

function AdminDashboard({ currentUser, onSignOut }: { currentUser: CurrentUser | null; onSignOut: () => void }) {
  const [users, setUsers] = useState<Array<{ _id: string; firstname: string; lastname: string; username: string; role: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;
    fetch(`${API_URL}/api/users`)
      .then((res) => res.json())
      .then((data) => { if (isMounted) setUsers(data); })
      .catch(() => { if (isMounted) setLoadError('Could not load users. Check your connection to the server.'); })
      .finally(() => { if (isMounted) setIsLoading(false); });
    return () => { isMounted = false; };
  }, []);

  return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.pageContent}>
    <View style={styles.topBar}><Brand /><Pressable onPress={onSignOut} hitSlop={12}><Ionicons name="log-out-outline" size={22} color={colors.ink} /></Pressable></View>
    <Text style={styles.eyebrow}>ADMIN DASHBOARD</Text><Text style={styles.dashboardHeading}>Welcome, {currentUser?.firstname || 'Admin'}.</Text><Text style={styles.mutedText}>An overview of everyone using SmartLessonPlanner.</Text>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>All accounts</Text><Text style={styles.countText}>{users.length} total</Text></View>
    {isLoading && <Text style={styles.mutedText}>Loading users…</Text>}
    {!!loadError && <Text style={styles.errorText}>{loadError}</Text>}
    {!isLoading && !loadError && users.length === 0 && <View style={styles.emptyState}><Ionicons name="people-outline" size={32} color={colors.accent} /><Text style={styles.emptyTitle}>No accounts yet.</Text></View>}
    {users.map((u) => (
      <View key={u._id} style={styles.userRow}>
        <View style={styles.userAvatar}><Text style={styles.userAvatarText}>{u.firstname?.[0]?.toUpperCase() || '?'}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{u.firstname} {u.lastname}</Text>
          <Text style={styles.userMeta}>@{u.username}</Text>
        </View>
        <View style={[styles.roleBadge, u.role === 'admin' && styles.roleBadgeAdmin]}>
          <Text style={[styles.roleBadgeText, u.role === 'admin' && styles.roleBadgeTextAdmin]}>{u.role === 'admin' ? 'Administrator' : 'Teacher'}</Text>
        </View>
      </View>
    ))}
  </ScrollView></SafeAreaView>;
}

// CREATE LESSON FORM --------

function LessonForm({ subject, grade, topic, objectives, setSubject, setGrade, setTopic, setObjectives, onBack, onSave, isSaving }: FormProps) {
  return <SafeAreaView style={styles.safeArea}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}><ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
    <ScreenHeader title="New lesson plan" onBack={onBack} />
    <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
    <Text style={styles.eyebrow}>STEP 1 OF 1</Text><Text style={styles.dashboardHeading}>Set the direction.</Text><Text style={styles.mutedText}>A few details will help shape a lesson that fits your classroom.</Text>
    <Text style={styles.formSectionTitle}>Subject</Text><View style={styles.chipWrap}>{subjects.map((item) => <ChoiceChip key={item} label={item} selected={subject === item} onPress={() => setSubject(item)} />)}</View>
    <Text style={styles.formSectionTitle}>Grade level</Text><View style={styles.chipWrap}>{grades.map((item) => <ChoiceChip key={item} label={item} selected={grade === item} onPress={() => setGrade(item)} />)}</View>
    <Field label="Topic" placeholder="e.g. The water cycle" value={topic} onChangeText={setTopic} />
    <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>Learning objectives</Text><TextInput style={[styles.input, styles.textArea]} placeholder="What should students understand or be able to do?" placeholderTextColor={colors.muted} multiline value={objectives} onChangeText={setObjectives} textAlignVertical="top" /></View>
    <Pressable style={[styles.primaryButton, (!subject || !grade || !topic || isSaving) && styles.disabledButton]} disabled={!subject || !grade || !topic || isSaving} onPress={onSave}><Text style={styles.primaryButtonText}>{isSaving ? 'Saving…' : 'Save lesson plan'}</Text><Ionicons name="arrow-forward" size={18} color={colors.paper} /></Pressable>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

// SHARED --------

function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.chip, selected && styles.selectedChip]}><Text style={[styles.chipText, selected && styles.selectedChipText]}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  flex: { flex: 1 }, safeArea: { flex: 1, backgroundColor: colors.paper },
  splash: { flex: 1, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  logoMark: { width: 62, height: 62, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  splashTitle: { color: colors.ink, fontSize: 30, fontWeight: '800' },
  splashCaption: { color: colors.muted, fontSize: 15, marginTop: 8 },
  authContent: { flexGrow: 1, padding: 28, justifyContent: 'center' },
  pageContent: { padding: 24, paddingBottom: 48 },
  authBrand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  smallLogo: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  brandName: { color: colors.ink, fontWeight: '800', fontSize: 17 },
  authIntro: { marginTop: 72, marginBottom: 34 },
  registerProgress: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  registerProgressSegment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.line },
  registerProgressSegmentActive: { backgroundColor: colors.accent },
  registerStepLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 22 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 12 },
  heading: { color: colors.ink, fontSize: 39, lineHeight: 43, fontWeight: '800', maxWidth: 340 },
  dashboardHeading: { color: colors.ink, fontSize: 32, lineHeight: 38, fontWeight: '800', marginBottom: 8 },
  mutedText: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  fieldGroup: { marginBottom: 19 },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: '#FFFFFF', color: colors.ink, fontSize: 16, paddingHorizontal: 15, height: 52, justifyContent: 'center' },
  passwordInputWrap: { position: 'relative' },
  passwordInput: { paddingRight: 50 },
  passwordEye: { position: 'absolute', right: 15, top: 15, zIndex: 1 },
  textArea: { height: 110, paddingTop: 14 },
  primaryButton: { height: 54, borderRadius: 11, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 },
  primaryButtonText: { color: colors.paper, fontSize: 16, fontWeight: '800' },
  disabledButton: { opacity: 0.4 },
  errorText: { color: '#B3261E', fontSize: 13, marginBottom: 14, fontWeight: '600' },
  switchAuth: { alignItems: 'center', marginTop: 24 },
  switchText: { color: colors.muted, fontSize: 14 },
  switchAction: { color: colors.ink, fontWeight: '800' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 44 },
  createCard: { backgroundColor: colors.ink, borderRadius: 16, padding: 22, marginTop: 34, minHeight: 190, justifyContent: 'space-between' },
  createKicker: { color: '#A9C8B2', fontWeight: '800', fontSize: 11, letterSpacing: 1.2, marginBottom: 14 },
  createTitle: { color: colors.paper, fontSize: 26, fontWeight: '800', marginBottom: 8 },
  createDescription: { color: '#C3D3C7', fontSize: 15, lineHeight: 22, maxWidth: 260 },
  arrowCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 38, marginBottom: 14 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  countText: { color: colors.muted, fontSize: 13 },
  emptyState: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 28, alignItems: 'center', backgroundColor: '#FFFFFF' },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  emptyDescription: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 7 },
  formTopTitle: { color: colors.ink, fontWeight: '800', fontSize: 17 },
  progressTrack: { height: 5, backgroundColor: colors.line, borderRadius: 3, marginBottom: 32 },
  progressFill: { width: '100%', height: 5, backgroundColor: colors.accent, borderRadius: 3 },
  formSectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: 28, marginBottom: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: '#FFFFFF', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 12 },
  selectedChip: { borderColor: colors.ink, backgroundColor: colors.ink },
  chipText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  selectedChipText: { color: colors.paper },
  birthdateRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  pickerFieldWrap: { flex: 1 },
  pickerValueText: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  pickerPlaceholderText: { color: colors.muted, fontSize: 15 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(23,59,54,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.paper, borderRadius: 16, padding: 20, width: '100%', maxWidth: 340, maxHeight: '70%' },
  modalTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginBottom: 12 },
  modalList: { marginBottom: 8 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  modalOptionText: { color: colors.ink, fontSize: 15 },
  modalOptionTextSelected: { fontWeight: '800' },
  ageDisplay: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.pale, borderRadius: 10, paddingHorizontal: 15, height: 52, marginBottom: 19 },
  ageDisplayLabel: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  ageDisplayValue: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  usernameHint: { color: colors.muted, fontSize: 12, marginTop: -12, marginBottom: 16 },
  usernameHintAvailable: { color: '#3E9C5A' },
  usernameHintTaken: { color: '#D64545' },
  suggestionWrap: { marginTop: -10, marginBottom: 14 },
  suggestionLabel: { color: colors.muted, fontSize: 12, marginBottom: 6 },
  suggestionChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  suggestionChip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.pale, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  suggestionChipText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  strengthWrap: { marginTop: -10, marginBottom: 19 },
  strengthTrack: { height: 5, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden' },
  strengthFill: { height: 5, borderRadius: 3 },
  strengthLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  strengthDot: { width: 8, height: 8, borderRadius: 4 },
  strengthLabelText: { fontSize: 12, fontWeight: '700' },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 19, marginTop: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.ink, borderColor: colors.ink },
  termsText: { color: colors.muted, fontSize: 13, flex: 1 },
  termsLink: { color: colors.ink, fontWeight: '800', textDecorationLine: 'underline' },
  termsBody: { color: colors.ink, fontSize: 14, lineHeight: 21 },
  successCard: { backgroundColor: colors.paper, borderRadius: 18, padding: 30, width: '100%', maxWidth: 320, alignItems: 'center' },
  successCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#3E9C5A', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  successTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  successSubtitle: { color: colors.muted, fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  userName: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  userMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  roleBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.pale },
  roleBadgeAdmin: { backgroundColor: colors.accent },
  roleBadgeText: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  roleBadgeTextAdmin: { color: colors.paper },
  avatarBase: { backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.ink, fontWeight: '800' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  quickTile: { width: '31%', borderWidth: 1, borderColor: colors.line, backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 10, alignItems: 'center' },
  quickIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickTileText: { color: colors.ink, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  lessonCard: { borderWidth: 1, borderColor: colors.line, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 10 },
  lessonCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  lessonSubjectTag: { color: colors.accent, fontWeight: '800', fontSize: 11, letterSpacing: 0.6 },
  lessonDate: { color: colors.muted, fontSize: 12 },
  lessonTopic: { color: colors.ink, fontWeight: '800', fontSize: 16, marginBottom: 4 },
  lessonMeta: { color: colors.muted, fontSize: 13 },
  profileRow: { borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 14 },
  profileRowLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  profileRowValue: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  settingsRowText: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  sideMenuBackdrop: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: 'rgba(23,59,54,0.45)' },
  sideMenuPanel: { width: 270, height: '100%', backgroundColor: colors.paper, padding: 22, paddingTop: 60 },
  sideMenuHeader: { alignItems: 'center', marginBottom: 26 },
  sideMenuName: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 10, marginBottom: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  menuItemText: { color: colors.ink, fontSize: 15, fontWeight: '600' },
});