import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, Briefcase, CalendarCheck, Compass, MapPinned, Navigation, Plane, Route, Star, Truck, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { AuthModal } from '../components/AuthModal';

const FEATURES = [
  { Icon: Zap, title: 'Optimisation automatique', text: "Jusqu'à 23 arrêts réordonnés pour le trajet le plus court en temps ou en distance." },
  { Icon: Navigation, title: 'Navigation en un clic', text: 'Ouvrez votre itinéraire complet dans Google Maps ou Waze.' },
  { Icon: Star, title: 'Adresses favorites', text: 'Domicile, travail, clients : retrouvez vos adresses en un tap.' },
  { Icon: Compass, title: 'Simplicité', text: 'Saisissez, importez un CSV, optimisez. Aucune installation.' },
];

const AUDIENCES = [
  { Icon: Briefcase, title: 'Commerciaux', text: 'Enchaînez plus de visites par jour.' },
  { Icon: Truck, title: 'Livreurs', text: 'Réduisez kilomètres et carburant.' },
  { Icon: Plane, title: 'Voyageurs', text: 'Organisez vos étapes sans détour.' },
  { Icon: CalendarCheck, title: 'Trajets quotidiens', text: 'Courses et déplacements simplifiés.' },
];

// Témoignages d'exemple : à remplacer par de vrais retours clients avant la mise en production.
const TESTIMONIALS = [
  { name: 'Camille D.', role: 'Commerciale itinérante', text: "Je gagne près d'une heure par jour sur mes tournées." },
  { name: 'Karim B.', role: 'Livreur indépendant', text: "L'import CSV me fait gagner un temps fou le matin." },
  { name: 'Julie M.', role: 'Technicienne de maintenance', text: "Mes interventions s'enchaînent sans détour." },
  { name: 'Thomas L.', role: 'Chauffeur VTC', text: "Simple, rapide, et l'export vers Waze est parfait." },
  { name: 'Sophie R.', role: 'Covoitureuse', text: 'Idéal pour organiser un trajet avec plusieurs étapes.' },
  { name: 'Nicolas P.', role: 'Responsable de tournée', text: 'Mon équipe a adopté l\'outil en quelques minutes.' },
];

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);

  const start = () => (user ? navigate('/app') : setShowAuth(true));

  return (
    <div className="min-h-full bg-white text-gray-900">
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-lg font-bold text-blue-600"><Route className="h-6 w-6" /> Navimizer</div>
          <button onClick={start} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Accéder à l'application</button>
        </div>
      </header>

      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center md:py-28">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight md:text-5xl">L'optimisation de trajets, simple et efficace</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">Évitez les détours inutiles, optimisez chaque itinéraire</p>
          <button onClick={start} className="mt-8 rounded-lg bg-white px-6 py-3 font-semibold text-blue-700 shadow-lg hover:bg-blue-50">Commencer maintenant</button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-10 text-center text-2xl font-bold">Tout pour optimiser vos trajets</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ Icon, title, text }) => (
            <div key={title} className="rounded-lg border border-gray-200 p-5 shadow-lg shadow-gray-100">
              <Icon className="mb-3 h-8 w-8 text-blue-600" />
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-gray-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold">Pour qui ?</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map(({ Icon, title, text }) => (
              <div key={title} className="rounded-lg bg-white p-5 text-center shadow-lg shadow-gray-100">
                <Icon className="mx-auto mb-3 h-8 w-8 text-blue-600" />
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-10 text-center text-2xl font-bold">Ils optimisent leurs trajets</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="rounded-lg border border-gray-200 p-5">
              <div className="mb-3 flex gap-0.5" aria-label="5 étoiles sur 5">
                {Array.from({ length: 5 }, (_, i) => <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />)}
              </div>
              <blockquote className="text-sm text-gray-700">« {t.text} »</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">{t.name[0]}</span>
                <span><span className="block text-sm font-medium">{t.name}</span><span className="block text-xs text-gray-500">{t.role}</span></span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="bg-blue-600 py-16 text-center text-white">
        <h2 className="text-2xl font-bold">Prêt à gagner du temps sur chaque trajet ?</h2>
        <button onClick={start} className="mt-6 rounded-lg bg-white px-6 py-3 font-semibold text-blue-700 shadow-lg hover:bg-blue-50">Commencer maintenant</button>
      </section>

      <footer className="bg-gray-900 text-gray-300">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
          <div><div className="flex items-center gap-2 font-bold text-white"><Route className="h-5 w-5" /> Navimizer</div><p className="mt-2 text-sm">Optimisation d'itinéraires multi-arrêts.</p></div>
          <div className="text-sm"><div className="mb-2 font-semibold text-white">Contact</div>
            <p>contact@navimizer.fr</p><p>01 23 45 67 89</p><p className="flex items-center gap-1"><MapPinned className="h-4 w-4" /> Paris, France</p></div>
          <div className="text-sm"><div className="mb-2 font-semibold text-white">Légal</div>
            <ul className="space-y-1"><li><a href="#" className="hover:text-white">Mentions légales</a></li><li><a href="#" className="hover:text-white">CGU</a></li><li><a href="#" className="hover:text-white">Confidentialité</a></li></ul></div>
        </div>
        <div className="border-t border-gray-800 py-4 text-center text-xs"><Bike className="mr-1 inline h-3 w-3" />© {new Date().getFullYear()} Navimizer</div>
      </footer>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => navigate('/app')} />}
    </div>
  );
}
