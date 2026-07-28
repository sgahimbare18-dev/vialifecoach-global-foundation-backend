const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const seedPath = path.join(__dirname, '..', 'seeds', 'academy_program_first3_courses.json');

function mapLessons(lessons = [], duration) {
  return lessons.map((lesson) => ({
    title: lesson.title,
    content: lesson.content_markdown,
    duration
  }));
}

function mapModules(modules = [], duration) {
  return modules.map((module) => ({
    title: module.title,
    lessons: mapLessons(module.lessons || [], duration)
  }));
}

function buildCourseCatalog() {
  try {
    const academyData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const introductoryCourse = academyData.introductory_course || {};
    const courses = Array.isArray(academyData.courses) ? academyData.courses : [];

    const prices = [299, 349, 379];
    const thumbnails = [
      'https://via.placeholder.com/300x200/E74C3C/FFFFFF?text=Confidence',
      'https://via.placeholder.com/300x200/F39C12/FFFFFF?text=Positive+Mindset',
      'https://via.placeholder.com/300x200/27AE60/FFFFFF?text=Action+Now'
    ];
    const lessonDurations = ['20 minutes', '25 minutes', '25 minutes'];

    return [
      {
        id: 6,
        title: introductoryCourse.title,
        description: introductoryCourse.overview,
        price: 0,
        thumbnail_url: 'https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=Orientation',
        duration: introductoryCourse.duration,
        level: 'Beginner',
        modules: mapModules(introductoryCourse.modules || [], '15 minutes')
      },
      ...courses.slice(0, 3).map((course, index) => ({
        id: 7 + index,
        title: course.title,
        description: course.overview,
        price: prices[index],
        thumbnail_url: thumbnails[index],
        duration: course.duration,
        level: course.level,
        pillar: course.pillar,
        objectives: course.objectives,
        modules: mapModules(course.modules || [], lessonDurations[index]),
        final_reflection: course.final_reflection
      }))
    ];
  } catch (error) {
    console.error('⚠️ Failed to load course seed data for /api/v1 compatibility:', error.message);
    return [];
  }
}

const fullCoursesData = buildCourseCatalog();

function findCourseById(id) {
  return fullCoursesData.find((course) => String(course.id) === String(id));
}

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'vialifecoach-backend',
    time: new Date().toISOString(),
    apiBase: '/api/v1'
  });
});

router.get('/courses', (req, res) => {
  res.json(fullCoursesData);
});

router.get('/courses/:id', (req, res) => {
  const course = findCourseById(req.params.id);

  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  return res.json(course);
});

router.get('/courses/:id/overview', (req, res) => {
  const course = findCourseById(req.params.id);

  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  return res.json(course);
});

router.get('/courses/:id/modules', (req, res) => {
  const course = findCourseById(req.params.id);

  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  return res.json({ success: true, data: course.modules || [] });
});

router.get('/courses/:id/modules-with-lessons', (req, res) => {
  const course = findCourseById(req.params.id);

  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  return res.json({ success: true, data: course.modules || [] });
});

router.post('/analytics/visit', (req, res) => {
  res.json({ success: true });
});

router.post('/analytics/share-click', (req, res) => {
  res.json({ success: true });
});

module.exports = router;
