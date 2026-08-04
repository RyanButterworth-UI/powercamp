import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Speakers as recorded in Wilhelm Smalberger's account. His list runs to 2010 —
// the year Lynnwood handed over — and the later years were left blank. Rather
// than guess at them, the page says plainly that they aren't recorded yet.
const SPEAKERS: { year: number; name: string }[] = [
  { year: 2001, name: 'Grant Philips' },
  { year: 2002, name: 'David Holdt' },
  { year: 2003, name: 'Jeff Gage' },
  { year: 2004, name: 'Glen Thompson' },
  { year: 2005, name: 'Paul Colyer' },
  { year: 2006, name: 'Jonathan Holdt' },
  { year: 2007, name: 'Clinton Stone' },
  { year: 2008, name: 'Joshua Mack' },
  { year: 2009, name: 'Tyrell Haag' },
  { year: 2010, name: 'Clint Archer' },
];

const ACROSTIC: { letter: string; word: string }[] = [
  { letter: 'P', word: 'Purity' },
  { letter: 'O', word: 'Obedience' },
  { letter: 'W', word: 'Worship' },
  { letter: 'E', word: 'Endurance' },
  { letter: 'R', word: 'Righteousness' },
];

// Public "History" page. The account below is Wilhelm Smalberger's own, kept in
// his words and only broken into sections for the web — the acrostic and the
// speaker list are pulled out as structured elements rather than reflowed prose.
@Component({
  selector: 'app-history',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container mx-auto px-4 py-8 max-w-3xl page-fade-in">
      <h1 class="text-3xl font-bold mb-2">The history of Power Camp</h1>
      <p class="text-sm uppercase tracking-wide mb-6" style="color: var(--color-saga-primary-hover)">
        Purity · Obedience · Worship · Endurance · Righteousness
      </p>

      <section class="saga-card p-6 mb-5" data-testid="founder-story">
        <p class="text-sm mb-4" style="color: var(--color-saga-text)">
          Power Camp will have been running for 25 years this year (2026). Where did it all
          begin?
        </p>

        <h2 class="text-lg font-semibold mb-2">The day of small beginnings</h2>
        <p class="text-sm mb-4" style="color: var(--color-saga-text)">
          The Bible tells us not to despise the day of small beginnings (Zechariah 4:10), for
          the Lord rejoices to see the work begin. And this work was all of the Lord! During
          the second half of the nineties, the YP at Lynnwood Baptist Church (LBC) in Pretoria
          was a very small group of high school teenagers. Some of the parents sensed the need
          to create a wider space in which the group could meet other young people of
          like-minded churches.
        </p>

        <h2 class="text-lg font-semibold mb-2">The idea</h2>
        <p class="text-sm mb-4" style="color: var(--color-saga-text)">
          In 2000 LBC was asked, by the then Reformed Baptist Association (RBA) — the
          forerunner to SOLA 5 — to organise an annual family conference over the Easter
          weekend. In the run-up to the first Conference in 2001, the Lord put an idea in
          Wilhelm Smalberger's heart. He discussed it with Ronald Kalifungwa, pastor of LBC at
          the time, who supported the idea of organising an annual camp for teens belonging to
          churches within the RBA group of churches. At the family conference, YP leaders of
          all the churches present at the camp were invited to an inaugural meeting. They were
          excited about the idea and, since Lynnwood was driving the initiative, it was
          automatically assumed that the role of convenor would fall on them.
        </p>

        <h2 class="text-lg font-semibold mb-2">The name</h2>
        <p class="text-sm mb-4" style="color: var(--color-saga-text)">
          This was the first of many meetings to come. We sought God's will in the
          conceptualisation of all the details of the camp, including the name. On the basis of
          Ephesians 3:16–18 we decided to call it Power Camp, with the acrostic:
        </p>
        <blockquote
          class="text-sm mb-4 pl-4"
          style="border-left: 2px solid var(--color-saga-primary); color: var(--color-saga-text-muted); font-style: italic;"
        >
          "I pray that out of His glorious riches He may strengthen you with power through His
          Spirit in your inner being, so that Christ may dwell in your hearts through faith,
          And I pray that you, being rooted and established in love, may have power, together
          with all the saints, to grasp how wide and deep is the love of Christ"
        </blockquote>
        <ul class="mb-4" data-testid="acrostic">
          @for (row of acrostic; track row.letter) {
            <li class="flex items-baseline gap-3 mb-1">
              <span
                class="font-bold"
                style="color: var(--color-saga-action); width: 1.25rem; font-size: 1.05rem;"
                >{{ row.letter }}</span
              >
              <span class="text-sm" style="color: var(--color-saga-text)">{{ row.word }}</span>
            </li>
          }
        </ul>

        <h2 class="text-lg font-semibold mb-2">Growth</h2>
        <p class="text-sm mb-4" style="color: var(--color-saga-text)">
          The first camp in 2001 was attended by 56 teens. From small beginnings the camp was
          blessed by the Lord, to such an extent that in following years capacity (maximum 120)
          at the YFC CYARA venue began to feel the pressure.
        </p>

        <h2 class="text-lg font-semibold mb-2">The handover</h2>
        <p class="text-sm mb-4" style="color: var(--color-saga-text)">
          The camp in 2010 was the last Power Camp coordinated by LBC. Towards the end of 2010
          Wilhelm responded positively to a request from his employer to take up a position in
          Belgium. He and his wife, Laura, after much prayer, approached Neil and Jill Cable of
          Brackenhurst Baptist Church who agreed to make themselves available to take over from
          Wilhelm and Laura from 2011. This year therefore marks the 15th time that Power Camp
          is being organised by the Cables.
        </p>

        <p class="text-sm mt-5" style="color: var(--color-saga-text-muted)">
          — {{ founderName }}, founder of Power Camp
        </p>
      </section>

      <section class="saga-card p-6 mb-5" data-testid="speakers">
        <h2 class="text-lg font-semibold mb-3">Speakers over the years</h2>
        <dl class="text-sm grid grid-cols-[4rem_1fr] gap-x-4 gap-y-1.5">
          @for (s of speakers; track s.year) {
            <dt style="color: var(--color-saga-text-muted)">{{ s.year }}</dt>
            <dd>{{ s.name }}</dd>
          }
        </dl>
        <p class="text-xs mt-4" style="color: var(--color-saga-text-muted)">
          The record of speakers from 2011 onward hasn't been collected yet. If you know who
          spoke in a given year, we'd love to fill in the gaps.
        </p>
      </section>

      <section class="saga-card p-6 mb-5" data-testid="today">
        <h2 class="text-lg font-semibold mb-2">Power Camp today</h2>
        <p class="text-sm mb-3" style="color: var(--color-saga-text)">
          Power Camp is currently organised by Neil Cable.
        </p>
        <p class="text-sm" style="color: var(--color-saga-text-muted)">
          Camp runs each year at YFC Magaliesburg for grades 8 to 12, with a leader programme
          for 18+. It's put on by a volunteer team, and it runs on the generosity of the
          families and churches behind it. More on what to expect on the
          <a routerLink="/info" style="color: var(--color-saga-primary)">Info</a> page.
        </p>
      </section>
    </div>
  `,
  styles: ``,
})
export class HistoryComponent {
  readonly speakers = SPEAKERS;
  readonly acrostic = ACROSTIC;
  readonly founderName = 'Wilhelm Smalberger';
}
