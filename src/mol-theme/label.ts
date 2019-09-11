/**
 * Copyright (c) 2018-2019 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @author David Sehnal <david.sehnal@gmail.com>
 */

import { Unit, StructureElement, StructureProperties as Props, Link } from '../mol-model/structure';
import { Loci } from '../mol-model/loci';
import { OrderedSet } from '../mol-data/int';

// for `labelFirst`, don't create right away to avoid problems with circular dependencies/imports
let elementLocA: StructureElement.Location
let elementLocB: StructureElement.Location

function setElementLocation(loc: StructureElement.Location, unit: Unit, index: StructureElement.UnitIndex) {
    loc.unit = unit
    loc.element = unit.elements[index]
}

export function lociLabel(loci: Loci): string {
    switch (loci.kind) {
        case 'structure-loci':
            return loci.structure.models.map(m => m.entry).join(', ')
        case 'element-loci':
            return structureElementStatsLabel(StructureElement.Stats.ofLoci(loci))
        case 'link-loci':
            const link = loci.links[0]
            return link ? linkLabel(link) : 'Unknown'
        case 'shape-loci':
            return loci.shape.name
        case 'group-loci':
            const g = loci.groups[0]
            return g ? loci.shape.getLabel(OrderedSet.start(g.ids), loci.instance) : 'Unknown'
        case 'every-loci':
            return 'Everything'
        case 'empty-loci':
            return 'Nothing'
        case 'data-loci':
            return ''
    }
}

function countLabel(count: number, label: string) {
    return count === 1 ? `1 ${label}` : `${count} ${label}s`
}

/** Gets residue count of the model chain segments the unit is a subset of */
function getResidueCount(unit: Unit.Atomic) {
    const { elements, model } = unit
    const { chainAtomSegments, residueAtomSegments } = model.atomicHierarchy
    const elementStart = chainAtomSegments.offsets[chainAtomSegments.index[elements[0]]]
    const elementEnd = chainAtomSegments.offsets[chainAtomSegments.index[elements[elements.length - 1]] + 1]
    return residueAtomSegments.index[elementEnd] - residueAtomSegments.index[elementStart]
}

export function structureElementStatsLabel(stats: StructureElement.Stats, countsOnly = false) {
    const { unitCount, residueCount, elementCount } = stats

    if (!countsOnly && elementCount === 1 && residueCount === 0 && unitCount === 0) {
        return elementLabel(stats.firstElementLoc, 'element')
    } else if (!countsOnly && elementCount === 0 && residueCount === 1 && unitCount === 0) {
        return elementLabel(stats.firstResidueLoc, 'residue')
    } else if (!countsOnly && elementCount === 0 && residueCount === 0 && unitCount === 1) {
        const { unit } = stats.firstUnitLoc
        const granularity = (Unit.isAtomic(unit) && getResidueCount(unit) === 1) ? 'residue' : 'chain'
        return elementLabel(stats.firstUnitLoc, granularity)
    } else {
        const label: string[] = []
        if (unitCount > 0) label.push(countLabel(unitCount, 'Chain'))
        if (residueCount > 0) label.push(countLabel(residueCount, 'Residue'))
        if (elementCount > 0) label.push(countLabel(elementCount, 'Element'))
        return label.join(', ')
    }
}

export function linkLabel(link: Link.Location) {
    if (!elementLocA) elementLocA = StructureElement.Location.create()
    if (!elementLocB) elementLocB = StructureElement.Location.create()
    setElementLocation(elementLocA, link.aUnit, link.aIndex)
    setElementLocation(elementLocB, link.bUnit, link.bIndex)
    return `${elementLabel(elementLocA)} - ${elementLabel(elementLocB)}`
}

export type LabelGranularity = 'element' | 'residue' | 'chain' | 'structure'

export function elementLabel(location: StructureElement.Location, granularity: LabelGranularity = 'element') {
    const model = location.unit.model.entry
    const instance = location.unit.conformation.operator.name
    const label = [model, instance]

    if (Unit.isAtomic(location.unit)) {
        label.push(atomicElementLabel(location as StructureElement.Location<Unit.Atomic>, granularity))
    } else if (Unit.isCoarse(location.unit)) {
        label.push(coarseElementLabel(location as StructureElement.Location<Unit.Spheres | Unit.Gaussians>, granularity))
    } else {
        label.push('Unknown')
    }

    return label.join(' | ')
}

export function atomicElementLabel(location: StructureElement.Location<Unit.Atomic>, granularity: LabelGranularity) {
    const label_asym_id = Props.chain.label_asym_id(location)
    const auth_asym_id = Props.chain.auth_asym_id(location)
    const seq_id = location.unit.model.atomicHierarchy.residues.auth_seq_id.isDefined ? Props.residue.auth_seq_id(location) : Props.residue.label_seq_id(location)
    const comp_id = Props.residue.label_comp_id(location)
    const atom_id = Props.atom.label_atom_id(location)
    const alt_id = Props.atom.label_alt_id(location)

    const microHetCompIds = Props.residue.microheterogeneityCompIds(location)
    const compId = granularity === 'residue' && microHetCompIds.length > 1 ?
        `(${microHetCompIds.join('|')})` : comp_id


    const label: string[] = []

    switch (granularity) {
        case 'element':
            label.push(`${atom_id}${alt_id ? `%${alt_id}` : ''}`)
        case 'residue':
            label.push(`${compId} ${seq_id}`)
        case 'chain':
            label.push(`Chain ${label_asym_id}:${auth_asym_id}`)
    }

    return label.reverse().join(' | ')
}

export function coarseElementLabel(location: StructureElement.Location<Unit.Spheres | Unit.Gaussians>, granularity: LabelGranularity) {
    // TODO handle granularity
    const asym_id = Props.coarse.asym_id(location)
    const seq_id_begin = Props.coarse.seq_id_begin(location)
    const seq_id_end = Props.coarse.seq_id_end(location)
    if (seq_id_begin === seq_id_end) {
        const entityIndex = Props.coarse.entityKey(location)
        const seq = location.unit.model.sequence.byEntityKey[entityIndex]
        const comp_id = seq.compId.value(seq_id_begin - 1) // 1-indexed
        return `${comp_id} ${seq_id_begin}:${asym_id}`
    } else {
        return `${seq_id_begin}-${seq_id_end}:${asym_id}`
    }
}