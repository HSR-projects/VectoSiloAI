// @ts-nocheck
// Template ID: page-careers
"use client";

import { motion } from "framer-motion";
import {
  HeartHandshake,
  Lightbulb,
  Users,
  Zap,
  Globe,
  Shield,
  Coffee,
  GraduationCap,
  Home,
  Dumbbell,
  ArrowRight,
  Rocket,
} from "lucide-react";
import { Accordion } from "../components/Accordion";
import { PageTransition } from "../components/PageTransition";

const values = [
  {
    icon: HeartHandshake,
    title: "People First",
    description:
      "We prioritize the well-being and growth of our team members above all else.",
  },
  {
    icon: Lightbulb,
    title: "Innovate Constantly",
    description:
      "We challenge conventions and encourage creative problem-solving at every level.",
  },
  {
    icon: Users,
    title: "Inclusive Community",
    description:
      "Diverse perspectives make us stronger. We foster an environment where everyone belongs.",
  },
  {
    icon: Zap,
    title: "Move Fast",
    description:
      "We ship quickly, learn from feedback, and iterate relentlessly toward excellence.",
  },
];

const benefits = [
  {
    icon: Globe,
    title: "Remote-First",
    description: "Work from anywhere in the world. Our team spans 15+ countries.",
  },
  {
    icon: Shield,
    title: "Comprehensive Insurance",
    description: "Medical, dental, and vision coverage for you and your dependents.",
  },
  {
    icon: Coffee,
    title: "Daily Stipend",
    description: "Meal and coffee stipends to keep you fueled and focused.",
  },
  {
    icon: GraduationCap,
    title: "Learning Budget",
    description: "$5,000 annual budget for courses, conferences, and books.",
  },
  {
    icon: Home,
    title: "Home Office Setup",
    description: "Get the equipment you need to create your ideal workspace.",
  },
  {
    icon: Dumbbell,
    title: "Wellness Program",
    description: "Gym membership, meditation apps, and mental health support.",
  },
];

const departments = [
  {
    id: "engineering",
    title: "Engineering",
    content: (
      <div className="space-y-4">
        {["Senior Software Engineer", "Backend Engineer", "DevOps Engineer", "Security Engineer"].map(
          (role) => (
            <div
              key={role}
              className="flex items-center justify-between rounded-lg border border-[#424242] bg-[#212121] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-[#ececec]">{role}</p>
                <p className="text-xs text-[#8e8e93]">San Francisco / Remote</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-lg bg-[#10a37f] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0d8c6b]"
              >
                Apply
              </motion.button>
            </div>
          )
        )}
      </div>
    ),
  },
  {
    id: "design",
    title: "Design",
    content: (
      <div className="space-y-4">
        {["Product Designer", "UX Researcher", "Design Engineer", "Visual Designer"].map(
          (role) => (
            <div
              key={role}
              className="flex items-center justify-between rounded-lg border border-[#424242] bg-[#212121] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-[#ececec]">{role}</p>
                <p className="text-xs text-[#8e8e93]">San Francisco / Remote</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-lg bg-[#10a37f] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0d8c6b]"
              >
                Apply
              </motion.button>
            </div>
          )
        )}
      </div>
    ),
  },
  {
    id: "marketing",
    title: "Marketing",
    content: (
      <div className="space-y-4">
        {["Growth Marketing Manager", "Content Strategist", "SEO Specialist", "Brand Designer"].map(
          (role) => (
            <div
              key={role}
              className="flex items-center justify-between rounded-lg border border-[#424242] bg-[#212121] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-[#ececec]">{role}</p>
                <p className="text-xs text-[#8e8e93]">San Francisco / Remote</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-lg bg-[#10a37f] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0d8c6b]"
              >
                Apply
              </motion.button>
            </div>
          )
        )}
      </div>
    ),
  },
  {
    id: "sales",
    title: "Sales",
    content: (
      <div className="space-y-4">
        {["Enterprise Account Executive", "Sales Development Rep", "Customer Success Manager", "Solutions Engineer"].map(
          (role) => (
            <div
              key={role}
              className="flex items-center justify-between rounded-lg border border-[#424242] bg-[#212121] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-[#ececec]">{role}</p>
                <p className="text-xs text-[#8e8e93]">San Francisco / Remote</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-lg bg-[#10a37f] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0d8c6b]"
              >
                Apply
              </motion.button>
            </div>
          )
        )}
      </div>
    ),
  },
];

const ValueCard = ({
  icon: Icon,
  title,
  description,
  index,
}: {
  icon: typeof HeartHandshake;
  title: string;
  description: string;
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1 }}
    className="rounded-xl border border-[#424242] bg-[#2f2f2f] p-6"
  >
    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#10a37f]/10">
      <Icon size={24} className="text-[#10a37f]" />
    </div>
    <h3 className="mt-4 text-base font-semibold text-[#ececec]">{title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-[#8e8e93]">{description}</p>
  </motion.div>
);

export default function CareersPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-[#212121]">
        <section className="relative overflow-hidden px-4 py-20">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(-45deg, #0d8c6d, #10a37f, #1a7f64, #212121)",
              backgroundSize: "400% 400%",
              animation: "gradientShift 15s ease infinite",
            }}
          />
          <style>{`
            @keyframes gradientShift {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
          `}</style>
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Rocket size={48} className="mx-auto text-white/60" />
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Join Our Team
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
                Help us build the future of AI-powered development. We are
                looking for passionate people who want to make a difference.
              </p>
              <motion.a
                href="#openings"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#10a37f] transition-colors hover:bg-white/90"
              >
                View Open Positions
                <ArrowRight size={16} />
              </motion.a>
            </motion.div>
          </div>
          <div
            className="absolute bottom-0 left-0 right-0 h-32"
            style={{
              background:
                "linear-gradient(to top, #212121, transparent)",
            }}
          />
        </section>

        <section className="px-4 py-20">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold text-[#ececec] sm:text-4xl">
                Our Culture
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-[#8e8e93]">
                We are building a workplace where creativity thrives, diverse
                perspectives are valued, and everyone has the autonomy to do
                their best work.
              </p>
            </motion.div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((value, i) => (
                <ValueCard key={value.title} {...value} index={i} />
              ))}
            </div>
          </div>
        </section>

        <section id="openings" className="border-t border-[#424242] px-4 py-20">
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold text-[#ececec] sm:text-4xl">
                Open Positions
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-[#8e8e93]">
                Find your next role and join a team that is shaping the future
                of development.
              </p>
            </motion.div>
            <div className="mt-12">
              <Accordion items={departments} />
            </div>
          </div>
        </section>

        <section className="border-t border-[#424242] bg-[#2f2f2f] px-4 py-20">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold text-[#ececec] sm:text-4xl">
                Why Work at KodaAI?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-[#8e8e93]">
                We believe in taking care of our team so they can focus on doing
                their best work.
              </p>
            </motion.div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((benefit, i) => {
                const Icon = benefit.icon;
                return (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-4 rounded-xl border border-[#424242] bg-[#212121] p-5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#10a37f]/10">
                      <Icon size={20} className="text-[#10a37f]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#ececec]">
                        {benefit.title}
                      </h3>
                      <p className="mt-1 text-sm text-[#8e8e93]">
                        {benefit.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-[#ececec]">
                Don&apos;t See a Role That Fits?
              </h2>
              <p className="mt-4 text-lg text-[#8e8e93]">
                We are always on the lookout for talented people. Send us your
                resume and tell us how you can contribute.
              </p>
              <motion.a
                href="#"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#10a37f] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0d8c6b]"
              >
                Send General Application
                <ArrowRight size={16} />
              </motion.a>
            </motion.div>
          </div>
        </section>

        <footer className="border-t border-[#424242] bg-[#2f2f2f] py-12">
          <div className="mx-auto max-w-6xl px-4 text-center text-sm text-[#8e8e93]">
            &copy; {new Date().getFullYear()} KodaAI. All rights reserved.
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
